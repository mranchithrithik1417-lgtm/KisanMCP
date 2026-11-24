"""FastMCP Server exposing the 8 KisanClaim MCP tools over stdio.

Tools:
1. find_plot(farmer_id)
2. get_satellite_change(plot_id, before_date, after_date)
3. get_rainfall(plot_id, start_date, end_date)
4. check_photo_location(plot_id, lat, lon)
5. get_claim_status(claim_id)
6. draft_claim(plot_id, crop, disaster_type, disaster_date, loss_percent_declared)
7. submit_claim(draft_id, token)  [GATED]
8. generate_report(claim_id)
"""

import sys
import os
import json
from typing import Dict, Any, Optional

# Ensure project root is in Python path for shared backend imports
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from mcp.server.fastmcp import FastMCP
from backend.db import (
    log_tool_call, get_farmer_plot, get_db_connection,
    create_claim_draft, verify_and_submit_claim, get_claim
)
from backend.services.satellite import get_satellite_change as svc_satellite_change
from backend.services.rainfall import get_rainfall_data as svc_rainfall_data
from backend.services.photo_check import check_photo_location as svc_photo_check
from backend.services.scorer import compute_verification_score, compute_indicative_payout
from backend.services.pdf_generator import generate_claim_pdf

# Initialize FastMCP Server
mcp = FastMCP("KisanClaim MCP Server")


@mcp.tool()
def find_plot(farmer_id: str) -> Dict[str, Any]:
    """Returns the farmer's saved plot: id, polygon, area in acres, DIGIPIN, and survey number.

    Args:
        farmer_id: The unique ID of the farmer (e.g. 'FMR-9876543210' or UUID).
    """
    plot = get_farmer_plot(farmer_id)
    if not plot:
        res = {"found": False, "error": f"No plot registered for farmer {farmer_id}"}
        log_tool_call("find_plot", {"farmer_id": farmer_id}, "Plot not found")
        return res

    result = {
        "found": True,
        "plot_id": plot["id"],
        "farmer_id": plot["farmer_id"],
        "polygon": plot["polygon"],
        "area_acres": plot["area_acres"],
        "perimeter_m": plot["perimeter_m"],
        "digipin": plot["digipin"],
        "survey_number": plot["survey_number"],
        "ulpin": plot.get("ulpin", "")
    }
    log_tool_call(
        "find_plot",
        {"farmer_id": farmer_id},
        f"Found plot {plot['id']} ({plot['area_acres']} ac, DIGIPIN {plot['digipin']})"
    )
    return result


@mcp.tool()
def get_satellite_change(plot_id: str, before_date: str, after_date: str, disaster_type: str = "flood") -> Dict[str, Any]:
    """Retrieves Sentinel-2 satellite NDVI vegetation index before and after disaster date, percent loss, and source flag.

    Args:
        plot_id: The ID of the crop plot.
        before_date: Pre-disaster reference date (YYYY-MM-DD).
        after_date: Post-disaster assessment date (YYYY-MM-DD).
        disaster_type: Type of disaster (flood, drought, hail, pest).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT polygon_json FROM plots WHERE id = ?", (plot_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        res = {"error": f"Plot {plot_id} not found"}
        log_tool_call("get_satellite_change", {"plot_id": plot_id}, "Plot not found")
        return res

    polygon = json.loads(row["polygon_json"])
    # Compute bbox [min_lon, min_lat, max_lon, max_lat]
    lats = [pt[0] for pt in polygon]
    lons = [pt[1] for pt in polygon]
    bbox = [min(lons), min(lats), max(lons), max(lats)]

    result = svc_satellite_change(bbox, before_date, after_date, disaster_type=disaster_type)
    result["plot_id"] = plot_id

    log_tool_call(
        "get_satellite_change",
        {"plot_id": plot_id, "before_date": before_date, "after_date": after_date},
        f"NDVI {result['ndvi_before']} -> {result['ndvi_after']} (-{result['ndvi_drop_percent']}%) [{result['source']}]"
    )
    return result


@mcp.tool()
def get_rainfall(plot_id: str, start_date: str, end_date: str, disaster_type: str = "flood") -> Dict[str, Any]:
    """Fetches daily rainfall data from Open-Meteo Archive API, calculates total, max day, and checks for disaster anomalies.

    Args:
        plot_id: The ID of the crop plot.
        start_date: Start of weather window (YYYY-MM-DD).
        end_date: End of weather window (YYYY-MM-DD).
        disaster_type: Type of disaster (flood, drought, hail, etc.).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT polygon_json FROM plots WHERE id = ?", (plot_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        res = {"error": f"Plot {plot_id} not found"}
        log_tool_call("get_rainfall", {"plot_id": plot_id}, "Plot not found")
        return res

    polygon = json.loads(row["polygon_json"])
    center_lat = sum(pt[0] for pt in polygon) / len(polygon)
    center_lon = sum(pt[1] for pt in polygon) / len(polygon)

    result = svc_rainfall_data(center_lat, center_lon, start_date, end_date, disaster_type=disaster_type)
    result["plot_id"] = plot_id

    log_tool_call(
        "get_rainfall",
        {"plot_id": plot_id, "start_date": start_date, "end_date": end_date, "disaster_type": disaster_type},
        f"Rainfall {result['total_mm']}mm (Peak {result['max_day_mm']}mm). Anomaly: {result['is_anomaly']} [{result['source']}]"
    )
    return result


@mcp.tool()
def check_photo_location(plot_id: str, lat: float, lon: float) -> Dict[str, Any]:
    """Validates if a captured geotagged photo was taken inside the plot or within the 400m perimeter buffer.

    Args:
        plot_id: The ID of the crop plot.
        lat: Latitude coordinate from photo geotag.
        lon: Longitude coordinate from photo geotag.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT polygon_json FROM plots WHERE id = ?", (plot_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        res = {"error": f"Plot {plot_id} not found"}
        log_tool_call("check_photo_location", {"plot_id": plot_id, "lat": lat, "lon": lon}, "Plot not found")
        return res

    polygon = json.loads(row["polygon_json"])
    result = svc_photo_check(polygon, lat, lon)
    result["plot_id"] = plot_id

    status_str = "PASSED (inside)" if result["is_inside"] else ("PASSED (buffer)" if result["passed"] else "FAILED (far)")
    log_tool_call(
        "check_photo_location",
        {"plot_id": plot_id, "lat": lat, "lon": lon},
        f"{status_str}: {result['distance_meters']}m from boundary"
    )
    return result


@mcp.tool()
def get_claim_status(claim_id: str) -> Dict[str, Any]:
    """Retrieves the current status, decision, indicative payout, and verification details of an insurance claim.

    Args:
        claim_id: The unique ID of the claim.
    """
    claim = get_claim(claim_id)
    if not claim:
        res = {"error": f"Claim {claim_id} not found"}
        log_tool_call("get_claim_status", {"claim_id": claim_id}, "Claim not found")
        return res

    result = {
        "claim_id": claim["id"],
        "status": claim["status"],
        "crop": claim["crop"],
        "disaster_type": claim["disaster_type"],
        "disaster_date": claim["disaster_date"],
        "loss_percent_declared": claim["loss_percent_declared"],
        "score": claim.get("score"),
        "indicative_payout_inr": claim.get("indicative_payout_inr"),
        "insurer_notes": claim.get("insurer_notes") or "",
        "pdf_path": claim.get("pdf_path") or "",
        "created_at": claim["created_at"],
        "updated_at": claim["updated_at"]
    }
    log_tool_call(
        "get_claim_status",
        {"claim_id": claim_id},
        f"Claim {claim_id}: Status {claim['status']}, Score {claim.get('score')}",
        claim_id=claim_id
    )
    return result


@mcp.tool()
def draft_claim(
    plot_id: str,
    crop: str,
    disaster_type: str,
    disaster_date: str,
    loss_percent_declared: float,
    evidence_json: str = "{}"
) -> Dict[str, Any]:
    """Saves a draft claim and returns a one-time 30-minute confirmation token. Does NOT submit the claim.

    Args:
        plot_id: The plot ID being claimed for.
        crop: Crop name (e.g. 'Ragi', 'Paddy', 'Groundnut').
        disaster_type: Disaster category ('flood', 'drought', 'hail', 'pest').
        disaster_date: Date when damage occurred (YYYY-MM-DD).
        loss_percent_declared: Farmer's self-assessed damage percentage (0-100).
        evidence_json: Optional JSON string with gathered evidence (NDVI, rainfall, photo check).
    """
    try:
        evidence_data = json.loads(evidence_json) if evidence_json else {}
    except Exception:
        evidence_data = {}

    draft = create_claim_draft(
        plot_id=plot_id,
        crop=crop,
        disaster_type=disaster_type,
        disaster_date=disaster_date,
        loss_percent_declared=float(loss_percent_declared),
        evidence_data=evidence_data
    )

    log_tool_call(
        "draft_claim",
        {
            "plot_id": plot_id, "crop": crop, "disaster_type": disaster_type,
            "disaster_date": disaster_date, "loss_percent": loss_percent_declared
        },
        f"Draft created: {draft['claim_id']} with token {draft['token']}",
        claim_id=draft["claim_id"]
    )
    return draft


@mcp.tool()
def submit_claim(draft_id: str, token: str) -> Dict[str, Any]:
    """Verifies the farmer's one-time confirmation token, executes verification scoring, and officially submits the claim.

    CRITICAL SECURITY GATE: This tool will strictly fail if the token does not exist,
    is already consumed, or has expired (> 30 mins). It is impossible to submit without farmer confirmation.

    Args:
        draft_id: The ID of the claim draft (e.g. 'CLM-XXXX').
        token: The one-time confirmation token (e.g. 'TOK-XXXX').
    """
    if not token or not token.strip():
        err_msg = "Security Gate Rejected: Token is missing. Farmer confirmation required to submit."
        log_tool_call("submit_claim", {"draft_id": draft_id, "token": ""}, err_msg, claim_id=draft_id)
        raise ValueError(err_msg)

    # 1. Verify token in database
    sub_res = verify_and_submit_claim(draft_id=draft_id, token=token)

    # 2. Compute verification score and indicative payout
    claim = get_claim(draft_id)
    if claim:
        ndvi_drop = float(claim.get("ndvi_drop_percent") or 0.0)
        # Check rainfall anomaly
        rain_total = float(claim.get("rainfall_total_mm") or 0.0)
        rain_max = float(claim.get("rainfall_max_day_mm") or 0.0)
        disaster_type = claim.get("disaster_type", "flood").lower()
        if disaster_type == "flood":
            rain_anomaly = rain_max >= 50.0 or rain_total >= 100.0
        elif disaster_type == "drought":
            rain_anomaly = rain_total < 10.0
        else:
            rain_anomaly = rain_max >= 50.0 or rain_total >= 100.0

        photo_passed = bool(claim.get("photo_passed", 1))
        declared_loss = float(claim.get("loss_percent_declared") or 50.0)
        area_acres = float(claim.get("area_acres") or 1.0)

        score_res = compute_verification_score(
            ndvi_drop_percent=ndvi_drop,
            rainfall_anomaly_matched=rain_anomaly,
            photo_passed=photo_passed,
            declared_loss_percent=declared_loss,
            rainfall_reason=claim.get("rainfall_reason") or ""
        )
        payout_res = compute_indicative_payout(area_acres, declared_loss)

        # Update claim with score
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE claims
            SET score = ?, score_reasons_json = ?, indicative_payout_inr = ?
            WHERE id = ?
            """,
            (
                score_res["score"],
                json.dumps(score_res["reasons"]),
                payout_res["indicative_payout_inr"],
                draft_id
            )
        )
        conn.commit()
        conn.close()

        sub_res["score"] = score_res["score"]
        sub_res["score_reasons"] = score_res["reasons"]
        sub_res["indicative_payout_inr"] = payout_res["indicative_payout_inr"]

    log_tool_call(
        "submit_claim",
        {"draft_id": draft_id, "token": token},
        f"Claim {draft_id} submitted successfully with token. Score: {sub_res.get('score')}",
        claim_id=draft_id
    )
    return sub_res


@mcp.tool()
def generate_report(claim_id: str) -> Dict[str, Any]:
    """Builds the comprehensive PDF claim dossier with ReportLab and returns its file path and download URL.

    Args:
        claim_id: The ID of the submitted claim.
    """
    claim = get_claim(claim_id)
    if not claim:
        res = {"error": f"Claim {claim_id} not found"}
        log_tool_call("generate_report", {"claim_id": claim_id}, "Claim not found")
        return res

    pdf_path = generate_claim_pdf(claim)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE claims SET pdf_path = ? WHERE id = ?", (pdf_path, claim_id))
    conn.commit()
    conn.close()

    filename = os.path.basename(pdf_path)
    download_url = f"/api/claims/{claim_id}/pdf"

    result = {
        "claim_id": claim_id,
        "pdf_path": pdf_path,
        "filename": filename,
        "download_url": download_url
    }
    log_tool_call(
        "generate_report",
        {"claim_id": claim_id},
        f"Generated PDF report: {filename}",
        claim_id=claim_id
    )
    return result


if __name__ == "__main__":
    mcp.run()
