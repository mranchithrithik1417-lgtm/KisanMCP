"""FastAPI application for KisanClaim MCP backend."""

import os
import sys
import uuid
import json
import base64
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.config import settings
from backend.db import (
    init_db, get_or_create_farmer, get_farmer_plot, save_plot,
    create_claim_draft, verify_and_submit_claim, get_claim, get_all_claims,
    update_claim_status, get_audit_logs, log_tool_call, get_db_connection
)
from backend.services.geometry import compute_plot_metrics
from backend.services.digipin import encode_digipin, decode_digipin
from backend.services.photo_check import check_photo_location
from backend.services.satellite import get_satellite_change
from backend.services.rainfall import get_rainfall_data
from backend.services.pdf_generator import generate_claim_pdf, REPORTS_DIR
from backend.agent import KisanClaimAgent, call_mcp_tool

app = FastAPI(
    title="KisanClaim MCP Backend",
    version="1.0.0",
    description="Farmer-first crop damage claim verification backend powered by Model Context Protocol (MCP)"
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload & reports directories exist
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.on_event("startup")
def on_startup():
    init_db()


# ==========================================
# 1. Farmer Auth & Profiles
# ==========================================

class LoginRequest(BaseModel):
    phone: str
    name: str = "Demo Farmer"


@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Simple farmer login: phone number + name, no real OTP. Creates farmer if new."""
    farmer = get_or_create_farmer(phone=req.phone, name=req.name)
    plot = get_farmer_plot(farmer["id"])
    return {
        "success": True,
        "farmer": farmer,
        "plot": plot
    }


# ==========================================
# 2. Plots & Geometry
# ==========================================

class PlotMetricsRequest(BaseModel):
    coordinates: List[List[float]]


@app.post("/api/plots/calculate")
def calculate_plot_metrics(req: PlotMetricsRequest):
    """Computes live area in acres, perimeter in meters, and center DIGIPIN using Shapely."""
    try:
        metrics = compute_plot_metrics(req.coordinates)
        return {"success": True, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class SavePlotRequest(BaseModel):
    farmer_id: str
    coordinates: List[List[float]]
    survey_number: str
    ulpin: Optional[str] = ""
    plot_id: Optional[str] = None


@app.post("/api/plots")
def create_or_update_plot(req: SavePlotRequest):
    """Saves plot geometry, computed metrics, survey number, and DIGIPIN."""
    try:
        metrics = compute_plot_metrics(req.coordinates)
        plot = save_plot(
            farmer_id=req.farmer_id,
            coords=req.coordinates,
            area_acres=metrics["area_acres"],
            perimeter_m=metrics["perimeter_m"],
            digipin=metrics["digipin"],
            survey_number=req.survey_number,
            ulpin=req.ulpin,
            plot_id=req.plot_id
        )
        return {"success": True, "plot": plot}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/plots/{farmer_id}")
def get_plot(farmer_id: str):
    """Fetches saved plot for a farmer."""
    plot = get_farmer_plot(farmer_id)
    if not plot:
        return {"success": False, "plot": None}
    return {"success": True, "plot": plot}


# ==========================================
# 3. Evidence Endpoints (Satellite & Rainfall)
# ==========================================

class SatelliteEvidenceRequest(BaseModel):
    plot_id: str
    before_date: str
    after_date: str
    disaster_type: str = "flood"


@app.post("/api/evidence/satellite")
async def get_satellite_evidence(req: SatelliteEvidenceRequest):
    """Calls MCP tool get_satellite_change over stdio."""
    res = await call_mcp_tool(
        "get_satellite_change",
        {
            "plot_id": req.plot_id,
            "before_date": req.before_date,
            "after_date": req.after_date,
            "disaster_type": req.disaster_type
        }
    )
    return res


class RainfallEvidenceRequest(BaseModel):
    plot_id: str
    start_date: str
    end_date: str
    disaster_type: str = "flood"


@app.post("/api/evidence/rainfall")
async def get_rainfall_evidence(req: RainfallEvidenceRequest):
    """Calls MCP tool get_rainfall over stdio."""
    res = await call_mcp_tool(
        "get_rainfall",
        {
            "plot_id": req.plot_id,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "disaster_type": req.disaster_type
        }
    )
    return res


# ==========================================
# 4. Geotagged Photo Upload & Verification
# ==========================================

@app.post("/api/photo/upload")
async def upload_photo(
    plot_id: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    photo: UploadFile = File(...)
):
    """Uploads captured field photograph with embedded canvas stamp and checks geofence."""
    file_ext = os.path.splitext(photo.filename or "photo.jpg")[1]
    filename = f"photo_{plot_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(UPLOADS_DIR, filename)

    content = await photo.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Call MCP tool check_photo_location
    check_res = await call_mcp_tool(
        "check_photo_location",
        {"plot_id": plot_id, "lat": lat, "lon": lon}
    )

    return {
        "success": True,
        "filename": filename,
        "photo_url": f"/uploads/{filename}",
        "photo_path": file_path,
        "lat": lat,
        "lon": lon,
        "check": check_res
    }


# ==========================================
# 5. Claims Lifecycle (Draft, Confirm, Submit, Review)
# ==========================================

class DraftClaimRequest(BaseModel):
    plot_id: str
    crop: str
    disaster_type: str
    disaster_date: str
    loss_percent_declared: float
    evidence: Optional[Dict[str, Any]] = None


@app.post("/api/claims/draft")
async def draft_claim_endpoint(req: DraftClaimRequest):
    """Creates a draft claim with a one-time confirmation token via MCP tool."""
    res = await call_mcp_tool(
        "draft_claim",
        {
            "plot_id": req.plot_id,
            "crop": req.crop,
            "disaster_type": req.disaster_type,
            "disaster_date": req.disaster_date,
            "loss_percent_declared": req.loss_percent_declared,
            "evidence_json": json.dumps(req.evidence or {})
        }
    )
    return res


class SubmitClaimRequest(BaseModel):
    draft_id: str
    token: str


@app.post("/api/claims/submit")
async def submit_claim_endpoint(req: SubmitClaimRequest):
    """Confirms and officially submits claim using token via MCP tool submit_claim."""
    if not req.token or not req.token.strip():
        raise HTTPException(
            status_code=400,
            detail="Security Gate Rejected: Token is missing. Farmer confirmation required to submit."
        )

    try:
        res = await call_mcp_tool(
            "submit_claim",
            {"draft_id": req.draft_id, "token": req.token}
        )
        if res.get("is_error") or "error" in res or res.get("status") != "SUBMITTED":
            raise HTTPException(
                status_code=400,
                detail=res.get("error") or res.get("text") or "Security Gate Rejected: Invalid or expired confirmation token."
            )

        # Generate PDF report automatically upon submission
        pdf_res = await call_mcp_tool("generate_report", {"claim_id": req.draft_id})
        res["report"] = pdf_res
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/claims")
def list_claims(farmer_id: Optional[str] = None):
    """Returns list of claims (all for insurer, or filtered by farmer_id)."""
    claims = get_all_claims(farmer_id=farmer_id)
    return {"claims": claims}


@app.get("/api/claims/{claim_id}")
async def get_claim_detail(claim_id: str):
    """Retrieves full claim details via MCP tool get_claim_status."""
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return {"claim": claim}


@app.get("/api/claims/{claim_id}/pdf")
async def download_claim_pdf(claim_id: str):
    """Downloads or previews the ReportLab PDF dossier."""
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    pdf_path = claim.get("pdf_path")
    if not pdf_path or not os.path.exists(pdf_path):
        # Generate on the fly
        pdf_path = generate_claim_pdf(claim)
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE claims SET pdf_path = ? WHERE id = ?", (pdf_path, claim_id))
        conn.commit()
        conn.close()

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_path)
    )


class ReviewClaimRequest(BaseModel):
    status: str  # APPROVED, REJECTED, UNDER_REVIEW
    insurer_notes: str = ""


@app.post("/api/claims/{claim_id}/review")
def review_claim_endpoint(claim_id: str, req: ReviewClaimRequest):
    """Insurer action: approve or reject claim with notes."""
    if req.status not in ["APPROVED", "REJECTED", "UNDER_REVIEW"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    res = update_claim_status(claim_id, req.status, req.insurer_notes)
    return {"success": True, "claim": res}


# ==========================================
# 6. Audit Trail
# ==========================================

@app.get("/api/audit-logs")
def audit_logs(claim_id: Optional[str] = None, limit: int = 100):
    """Returns MCP tool execution audit trail."""
    logs = get_audit_logs(limit=limit, claim_id=claim_id)
    return {"logs": logs}


# ==========================================
# 7. Assistant Chat (Driven by MCP Tools)
# ==========================================

class ChatMessageRequest(BaseModel):
    session_id: str
    farmer_id: str
    message: str = ""
    payload: Optional[Dict[str, Any]] = None


@app.post("/api/agent/chat")
async def agent_chat(req: ChatMessageRequest):
    """Chat assistant endpoint that processes message and yields status/card responses."""
    events = []
    async for event in KisanClaimAgent.process_message(
        session_id=req.session_id,
        farmer_id=req.farmer_id,
        user_message=req.message,
        quick_payload=req.payload
    ):
        events.append(event)
    return {"events": events}


# ==========================================
# 8. Voice & TTS (Optional ElevenLabs)
# ==========================================

class TTSRequest(BaseModel):
    text: str
    lang: str = "en"  # "en" or "kn"


@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    """Optional backend TTS endpoint calling ElevenLabs if ELEVENLABS_API_KEY is configured."""
    api_key = settings.ELEVENLABS_API_KEY
    if not api_key:
        return {"mode": "browser", "message": "Using browser SpeechSynthesis"}

    try:
        import httpx
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default clean voice
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        body = {
            "text": req.text,
            "model_id": "eleven_multilingual_v2"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            if resp.status_code == 200:
                audio_base64 = base64.b64encode(resp.content).decode("utf-8")
                return {"mode": "elevenlabs", "audio_base64": audio_base64}
    except Exception:
        pass

    return {"mode": "browser", "message": "Fallback to browser SpeechSynthesis"}


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "KisanClaim MCP Backend",
        "demo_mode": settings.DEMO_MODE,
        "mcp": "FastMCP stdio active"
    }
