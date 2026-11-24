"""KisanClaim Assistant Agent using official MCP stdio ClientSession and guided state machine."""

import os
import sys
import json
import re
import datetime
from typing import Dict, Any, List, Optional, AsyncGenerator

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from backend.config import settings
from backend.db import get_farmer_plot, get_claim, get_or_create_farmer


async def call_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Invokes a tool on the FastMCP server over stdio via official MCP SDK."""
    server_script = os.path.join(ROOT_DIR, "mcp_server", "server.py")
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[server_script],
        env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONPATH": ROOT_DIR}
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments)
            if result.isError:
                err_text = result.content[0].text if result.content else f"Tool {tool_name} failed"
                raise ValueError(err_text)
            if result.content and len(result.content) > 0:
                raw_text = result.content[0].text
                try:
                    return json.loads(raw_text)
                except Exception:
                    return {"text": raw_text}
            return {}


# In-memory session store for multi-turn guided conversations
AGENT_SESSIONS: Dict[str, Dict[str, Any]] = {}


def get_or_create_session(session_id: str, farmer_id: str) -> Dict[str, Any]:
    """Retrieves or creates agent conversation session."""
    if session_id not in AGENT_SESSIONS:
        AGENT_SESSIONS[session_id] = {
            "session_id": session_id,
            "farmer_id": farmer_id,
            "step": "GREETING",
            "data": {
                "crop": None,
                "disaster_type": None,
                "disaster_date": None,
                "loss_percent": None,
                "photo_lat": None,
                "photo_lon": None,
                "photo_path": None,
                "plot_id": None,
                "draft_id": None,
                "token": None
            },
            "history": []
        }
    return AGENT_SESSIONS[session_id]


def extract_keywords_from_text(text: str) -> Dict[str, Any]:
    """Extracts disaster type, crop, and relative date from natural speech or text."""
    t = text.lower()
    extracted: Dict[str, Any] = {}

    # Disasters
    if "flood" in t or "water" in t or "rain" in t or "ಮಳೆ" in t or "ಪ್ರವಾಹ" in t:
        extracted["disaster_type"] = "flood"
    elif "drought" in t or "dry" in t or "ಬರ" in t:
        extracted["disaster_type"] = "drought"
    elif "hail" in t or "stone" in t or "ಆಲಿಕಲ್ಲು" in t:
        extracted["disaster_type"] = "hail"
    elif "pest" in t or "worm" in t or "bug" in t or "ಕೀಟ" in t:
        extracted["disaster_type"] = "pest"

    # Crops
    if "ragi" in t or "ರಾಗಿ" in t or "millet" in t:
        extracted["crop"] = "Ragi"
    elif "paddy" in t or "rice" in t or "ಭತ್ತ" in t:
        extracted["crop"] = "Paddy"
    elif "groundnut" in t or "peanut" in t or "ಕಡಲೆಕಾಯಿ" in t:
        extracted["crop"] = "Groundnut"
    elif "maize" in t or "corn" in t or "ಮೆಕ್ಕೆಜೋಳ" in t:
        extracted["crop"] = "Maize"

    # Dates
    today = datetime.date.today()
    if "today" in t or "ಇಂದು" in t:
        extracted["disaster_date"] = today.isoformat()
    elif "yesterday" in t or "ನಿನ್ನೆ" in t:
        extracted["disaster_date"] = (today - datetime.timedelta(days=1)).isoformat()
    elif "3 days" in t or "ಮೂರು ದಿನ" in t:
        extracted["disaster_date"] = (today - datetime.timedelta(days=3)).isoformat()
    elif "week" in t or "ವಾರ" in t:
        extracted["disaster_date"] = (today - datetime.timedelta(days=7)).isoformat()
    else:
        # Check for YYYY-MM-DD pattern
        match = re.search(r"\b(202\d-\d{2}-\d{2})\b", text)
        if match:
            extracted["disaster_date"] = match.group(1)

    # Loss percentage
    loss_match = re.search(r"\b(\d{1,2})\s*%", text)
    if loss_match:
        extracted["loss_percent"] = float(loss_match.group(1))

    return extracted


class KisanClaimAgent:
    """Guided state-machine assistant that drives the full claim lifecycle using MCP tools."""

    @staticmethod
    async def process_message(
        session_id: str,
        farmer_id: str,
        user_message: str,
        quick_payload: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Processes farmer message and yields progress events and final response."""
        session = get_or_create_session(session_id, farmer_id)
        current_step = session["step"]
        data = session["data"]

        # If incoming message has explicit payload (e.g. quick reply button clicked)
        payload = quick_payload or {}
        for k in ["crop", "disaster_type", "disaster_date", "loss_percent", "photo_lat", "photo_lon", "photo_path", "token", "draft_id"]:
            if k in payload and payload[k] is not None:
                data[k] = payload[k]

        # Extract keywords from free text
        if user_message:
            kw = extract_keywords_from_text(user_message)
            for k, v in kw.items():
                if data[k] is None:
                    data[k] = v

        # 1. State: GREETING / INITIAL
        if current_step == "GREETING":
            if not data["crop"]:
                session["step"] = "ASK_CROP"
                yield {
                    "type": "message",
                    "sender": "assistant",
                    "text_en": "Namaste! I am your KisanClaim Assistant. What crop was affected on your plot?",
                    "text_kn": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕಿಸಾನ್‌ಕ್ಲೈಮ್ ಸಹಾಯಕ. ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ಯಾವ ಬೆಳೆಗೆ ಹಾನಿಯಾಗಿದೆ?",
                    "quick_replies": [
                        {"label_en": "🌾 Ragi (Finger Millet)", "label_kn": "🌾 ರಾಗಿ", "value": "Ragi"},
                        {"label_en": "🌾 Paddy (Rice)", "label_kn": "🌾 ಭತ್ತ", "value": "Paddy"},
                        {"label_en": "🥜 Groundnut", "label_kn": "🥜 ಕಡಲೆಕಾಯಿ", "value": "Groundnut"},
                        {"label_en": "🌽 Maize", "label_kn": "🌽 ಮೆಕ್ಕೆಜೋಳ", "value": "Maize"}
                    ]
                }
                return
            else:
                current_step = "ASK_CROP"

        # 2. State: ASK_CROP -> transitions to ASK_DISASTER
        if current_step == "ASK_CROP":
            if payload.get("value") and not data["crop"]:
                data["crop"] = payload["value"]
            if not data["disaster_type"]:
                session["step"] = "ASK_DISASTER"
                yield {
                    "type": "message",
                    "sender": "assistant",
                    "text_en": f"Selected crop: {data['crop']}. What type of disaster damaged your crop?",
                    "text_kn": f"ಆಯ್ಕೆಮಾಡಿದ ಬೆಳೆ: {data['crop']}. ನಿಮ್ಮ ಬೆಳೆಗೆ ಯಾವ ರೀತಿಯ ಪ್ರಕೃತಿ ವಿಕೋಪದಿಂದ ಹಾನಿಯಾಗಿದೆ?",
                    "quick_replies": [
                        {"label_en": "🌊 Flood / Waterlogging", "label_kn": "🌊 ಪ್ರವಾಹ / ನೀರಿನ ನಿಲುಗಡೆ", "value": "flood"},
                        {"label_en": "☀️ Drought / Dry Spell", "label_kn": "☀️ ಬರ / ಮಳೆ ಕೊರತೆ", "value": "drought"},
                        {"label_en": "🌨️ Hailstorm", "label_kn": "🌨️ ಆಲಿಕಲ್ಲು ಮಳೆ", "value": "hail"},
                        {"label_en": "🐛 Pest Attack", "label_kn": "🐛 ಕೀಟ ಬಾಧೆ", "value": "pest"}
                    ]
                }
                return
            else:
                current_step = "ASK_DISASTER"

        # 3. State: ASK_DISASTER -> transitions to ASK_DATE
        if current_step == "ASK_DISASTER":
            if payload.get("value") and not data["disaster_type"]:
                data["disaster_type"] = payload["value"]
            if not data["disaster_date"]:
                session["step"] = "ASK_DATE"
                today = datetime.date.today()
                yield {
                    "type": "message",
                    "sender": "assistant",
                    "text_en": f"Disaster: {data['disaster_type'].capitalize()}. When did this disaster happen?",
                    "text_kn": f"ವಿಕೋಪ: {data['disaster_type']}. ಈ ಘಟನೆ ಯಾವಾಗ ಸಂಭವಿಸಿತು?",
                    "quick_replies": [
                        {"label_en": "📅 Today", "label_kn": "📅 ಇಂದು", "value": today.isoformat()},
                        {"label_en": "📅 Yesterday", "label_kn": "📅 ನಿನ್ನೆ", "value": (today - datetime.timedelta(days=1)).isoformat()},
                        {"label_en": "📅 3 Days Ago", "label_kn": "📅 3 ದಿನಗಳ ಹಿಂದೆ", "value": (today - datetime.timedelta(days=3)).isoformat()},
                        {"label_en": "📅 1 Week Ago", "label_kn": "📅 1 ವಾರದ ಹಿಂದೆ", "value": (today - datetime.timedelta(days=7)).isoformat()}
                    ]
                }
                return
            else:
                current_step = "ASK_DATE"

        # 4. State: ASK_DATE -> transitions to ASK_LOSS
        if current_step == "ASK_DATE":
            if payload.get("value") and not data["disaster_date"]:
                data["disaster_date"] = payload["value"]
            if data["loss_percent"] is None:
                session["step"] = "ASK_LOSS"
                yield {
                    "type": "message",
                    "sender": "assistant",
                    "text_en": "What is your estimated crop loss percentage?",
                    "text_kn": "ನಿಮ್ಮ ಅಂದಾಜು ಬೆಳೆ ನಷ್ಟದ ಪ್ರಮಾಣ (ಶೇಕಡಾವಾರು) ಎಷ್ಟು?",
                    "quick_replies": [
                        {"label_en": "📉 30% Loss", "label_kn": "📉 30% ನಷ್ಟ", "value": 30.0},
                        {"label_en": "📉 50% Loss", "label_kn": "📉 50% ನಷ್ಟ", "value": 50.0},
                        {"label_en": "📉 70% Loss", "label_kn": "📉 70% ನಷ್ಟ", "value": 70.0},
                        {"label_en": "📉 90% Severe Loss", "label_kn": "📉 90% ತೀವ್ರ ನಷ್ಟ", "value": 90.0}
                    ]
                }
                return
            else:
                current_step = "ASK_LOSS"

        # 5. State: ASK_LOSS -> transitions to RUN_MCP_EVIDENCE
        if current_step == "ASK_LOSS":
            if payload.get("value") and data["loss_percent"] is None:
                data["loss_percent"] = float(payload["value"])

            session["step"] = "RUN_MCP_EVIDENCE"

        # 6. State: RUN_MCP_EVIDENCE -> Calls real MCP Tools & streams live status lines
        if session["step"] == "RUN_MCP_EVIDENCE":
            server_script = os.path.join(ROOT_DIR, "mcp_server", "server.py")
            server_params = StdioServerParameters(
                command=sys.executable,
                args=[server_script],
                env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONPATH": ROOT_DIR}
            )

            # Start single MCP stdio session to execute all evidence tools rapidly
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as mcp_session:
                    await mcp_session.initialize()

                    # Stream status event 1: find_plot
                    yield {
                        "type": "status",
                        "text_en": "🔍 Connecting to MCP server: Calling find_plot()...",
                        "text_kn": "🔍 ಎಂಸಿಪಿ ಪರಿಕರ: ಜಮೀನಿನ ಗಡಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ..."
                    }
                    p_res_raw = await mcp_session.call_tool("find_plot", {"farmer_id": farmer_id})
                    plot_res = json.loads(p_res_raw.content[0].text) if p_res_raw.content else {}

                    if not plot_res.get("found"):
                        yield {
                            "type": "message",
                            "sender": "assistant",
                            "text_en": "⚠️ Could not find a registered plot for your account. Please mark your field on the map first.",
                            "text_kn": "⚠️ ನಿಮ್ಮ ಖಾತೆಗೆ ಯಾವುದೇ ಜಮೀನು ನೋಂದಣಿಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೊದಲು ನಕ್ಷೆಯಲ್ಲಿ ನಿಮ್ಮ ಹೊಲವನ್ನು ಗುರುತಿಸಿ.",
                            "action": "NAVIGATE_TO_PLOT"
                        }
                        session["step"] = "GREETING"
                        return

                    plot_id = plot_res["plot_id"]
                    data["plot_id"] = plot_id
                    data["digipin"] = plot_res.get("digipin", "N/A")
                    data["area_acres"] = plot_res.get("area_acres", 1.0)

                    # Stream status event 2: get_satellite_change
                    yield {
                        "type": "status",
                        "text_en": "🛰️ MCP Tool: Querying Sentinel-2 STAC for NDVI vegetation change...",
                        "text_kn": "🛰️ ಎಂಸಿಪಿ ಪರಿಕರ: ಉಪಗ್ರಹ ಚಿತ್ರಗಳಿಂದ ಬೆಳೆ ಸ್ಥಿತಿಯನ್ನು ಪರೀಕ್ಷಿಸಲಾಗುತ್ತಿದೆ..."
                    }
                    disaster_dt = datetime.datetime.strptime(data["disaster_date"], "%Y-%m-%d").date()
                    before_date = (disaster_dt - datetime.timedelta(days=15)).isoformat()
                    after_date = (disaster_dt + datetime.timedelta(days=7)).isoformat()

                    s_res_raw = await mcp_session.call_tool(
                        "get_satellite_change",
                        {
                            "plot_id": plot_id,
                            "before_date": before_date,
                            "after_date": after_date,
                            "disaster_type": data["disaster_type"]
                        }
                    )
                    sat_res = json.loads(s_res_raw.content[0].text) if s_res_raw.content else {}

                    # Stream status event 3: get_rainfall
                    yield {
                        "type": "status",
                        "text_en": "🌧️ MCP Tool: Fetching Open-Meteo rainfall archive & detecting anomalies...",
                        "text_kn": "🌧️ ಎಂಸಿಪಿ ಪರಿಕರ: ಹವಾಮಾನ ಮಳೆ ವಿವರಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ..."
                    }
                    rain_start = (disaster_dt - datetime.timedelta(days=7)).isoformat()
                    rain_end = (disaster_dt + datetime.timedelta(days=7)).isoformat()
                    r_res_raw = await mcp_session.call_tool(
                        "get_rainfall",
                        {
                            "plot_id": plot_id,
                            "start_date": rain_start,
                            "end_date": rain_end,
                            "disaster_type": data["disaster_type"]
                        }
                    )
                    rain_res = json.loads(r_res_raw.content[0].text) if r_res_raw.content else {}

                    # Stream status event 4: check_photo_location
                    yield {
                        "type": "status",
                        "text_en": "📍 MCP Tool: Verifying field photo geotag against 400m perimeter buffer...",
                        "text_kn": "📍 ಎಂಸಿಪಿ ಪರಿಕರ: ಫೋಟೋ ಸ್ಥಳವನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ..."
                    }
                    photo_lat = data.get("photo_lat") or plot_res["polygon"][0][0]
                    photo_lon = data.get("photo_lon") or plot_res["polygon"][0][1]

                    ph_res_raw = await mcp_session.call_tool(
                        "check_photo_location",
                        {
                            "plot_id": plot_id,
                            "lat": float(photo_lat),
                            "lon": float(photo_lon)
                        }
                    )
                    photo_res = json.loads(ph_res_raw.content[0].text) if ph_res_raw.content else {}

                    # Stream status event 5: draft_claim
                    yield {
                        "type": "status",
                        "text_en": "📝 MCP Tool: Creating draft claim & issuing one-time confirmation token...",
                        "text_kn": "📝 ಎಂಸಿಪಿ ಪರಿಕರ: ಪರಿಶೀಲನಾ ಟೋಕನ್ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ..."
                    }

                    evidence_package = {
                        "ndvi_before": sat_res.get("ndvi_before"),
                        "ndvi_after": sat_res.get("ndvi_after"),
                        "ndvi_drop_percent": sat_res.get("ndvi_drop_percent"),
                        "satellite_source": sat_res.get("source"),
                        "rainfall_total_mm": rain_res.get("total_mm"),
                        "rainfall_max_day_mm": rain_res.get("max_day_mm"),
                        "rainfall_max_date": rain_res.get("max_day_date"),
                        "rainfall_source": rain_res.get("source"),
                        "rainfall_reason": rain_res.get("anomaly_reason"),
                        "rainfall_daily": rain_res.get("daily", []),
                        "photo_lat": photo_lat,
                        "photo_lon": photo_lon,
                        "photo_distance_meters": photo_res.get("distance_meters", 0.0),
                        "photo_passed": photo_res.get("passed", True)
                    }

                    dr_res_raw = await mcp_session.call_tool(
                        "draft_claim",
                        {
                            "plot_id": plot_id,
                            "crop": data["crop"],
                            "disaster_type": data["disaster_type"],
                            "disaster_date": data["disaster_date"],
                            "loss_percent_declared": data["loss_percent"],
                            "evidence_json": json.dumps(evidence_package)
                        }
                    )
                    draft_res = json.loads(dr_res_raw.content[0].text) if dr_res_raw.content else {}

            draft_id = draft_res["claim_id"]
            token = draft_res["token"]
            data["draft_id"] = draft_id
            data["token"] = token
            session["step"] = "AWAITING_CONFIRMATION"

            # Compute preliminary indicative payout
            area_ac = float(plot_res.get("area_acres", 1.0))
            loss_pct = float(data["loss_percent"])
            sof = float(settings.SCALE_OF_FINANCE_PER_ACRE)
            indicative_inr = round(area_ac * sof * (loss_pct / 100.0), 2)

            yield {
                "type": "draft_summary_card",
                "sender": "assistant",
                "draft_id": draft_id,
                "token": token,
                "crop": data["crop"],
                "disaster_type": data["disaster_type"],
                "disaster_date": data["disaster_date"],
                "loss_percent": loss_pct,
                "area_acres": area_ac,
                "digipin": plot_res.get("digipin"),
                "satellite_evidence": sat_res,
                "rainfall_evidence": rain_res,
                "photo_check": photo_res,
                "indicative_payout_inr": indicative_inr,
                "payout_disclaimer": "Indicative estimate, not an official PMFBY amount",
                "text_en": (
                    f"Evidence gathering complete via real MCP tools! I have drafted claim {draft_id}.\n"
                    f"• Satellite NDVI Loss: -{sat_res.get('ndvi_drop_percent')}% [{sat_res.get('badge')}]\n"
                    f"• Peak Rainfall: {rain_res.get('max_day_mm')} mm\n"
                    f"• Photo Geofence: {photo_res.get('message_en')}\n"
                    f"• Indicative Payout: ₹{indicative_inr:,.2f}*\n\n"
                    "Press 'Yes, file my claim' to submit with your one-time confirmation token."
                ),
                "text_kn": (
                    f"ಎಂಸಿಪಿ ಪರಿಕರಗಳಿಂದ ಮಾಹಿತಿ ಸಂಗ್ರಹ ಪೂರ್ಣಗೊಂಡಿದೆ! ಕರಡು ಕ್ಲೈಮ್ {draft_id} ಸಿದ್ಧವಾಗಿದೆ.\n"
                    f"• ಉಪಗ್ರಹ ಬೆಳೆ ನಷ್ಟ: -{sat_res.get('ndvi_drop_percent')}%\n"
                    f"• ಗರಿಷ್ಠ ಮಳೆ: {rain_res.get('max_day_mm')} ಮಿಮೀ\n"
                    f"• ಅಂದಾಜು ಪರಿಹಾರ: ₹{indicative_inr:,.2f}*\n\n"
                    "ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಲು 'ಹೌದು, ನನ್ನ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ' ಬಟನ್ ಒತ್ತಿರಿ."
                ),
                "requires_confirm": True
            }
            return

        # 7. State: AWAITING_CONFIRMATION -> Executes submit_claim + generate_report only upon token confirmation
        if session["step"] == "AWAITING_CONFIRMATION":
            # Check if user clicked confirmation
            confirmed = payload.get("confirm") is True or "yes" in user_message.lower() or "file" in user_message.lower()
            if not confirmed:
                yield {
                    "type": "message",
                    "sender": "assistant",
                    "text_en": "Your claim draft is ready. Please click 'Yes, file my claim' to submit.",
                    "text_kn": "ನಿಮ್ಮ ಕ್ಲೈಮ್ ಕರಡು ಸಿದ್ಧವಾಗಿದೆ. ದಯವಿಟ್ಟು ಸಲ್ಲಿಸಲು 'ಹೌದು, ನನ್ನ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ' ಬಟನ್ ಒತ್ತಿರಿ.",
                    "requires_confirm": True,
                    "draft_id": data.get("draft_id"),
                    "token": data.get("token")
                }
                return

            draft_id = data.get("draft_id")
            token = data.get("token")

            # Stream submit status
            yield {
                "type": "status",
                "text_en": f"🔒 MCP Tool: Verifying confirmation token {token} & submitting claim...",
                "text_kn": "🔒 ಎಂಸಿಪಿ ಪರಿಕರ: ಟೋಕನ್ ಪರಿಶೀಲಿಸಿ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ..."
            }

            sub_res = await call_mcp_tool("submit_claim", {"draft_id": draft_id, "token": token})

            # Stream PDF generation status
            yield {
                "type": "status",
                "text_en": "📄 MCP Tool: Building official PDF verification dossier & QR code...",
                "text_kn": "📄 ಎಂಸಿಪಿ ಪರಿಕರ: ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ವರದಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ..."
            }

            rep_res = await call_mcp_tool("generate_report", {"claim_id": draft_id})

            session["step"] = "COMPLETED"

            score = sub_res.get("score", 85)
            score_reasons = sub_res.get("score_reasons", [])
            payout = sub_res.get("indicative_payout_inr", 0.0)

            yield {
                "type": "claim_completed_card",
                "sender": "assistant",
                "claim_id": draft_id,
                "status": "SUBMITTED",
                "score": score,
                "score_reasons": score_reasons,
                "indicative_payout_inr": payout,
                "pdf_url": rep_res.get("download_url", f"/api/claims/{draft_id}/pdf"),
                "text_en": (
                    f"🎉 Claim {draft_id} submitted successfully to the insurer queue!\n"
                    f"• Algorithmic Verification Score: {score}/100 (Indicative)\n"
                    f"• Indicative Payout: ₹{payout:,.2f}*\n"
                    "You can now download your official PDF dossier or track the claim status."
                ),
                "text_kn": (
                    f"🎉 ನಿಮ್ಮ ಕ್ಲೈಮ್ {draft_id} ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಕೆಯಾಗಿದೆ!\n"
                    f"• ಪರಿಶೀಲನಾ ಅಂಕ: {score}/100\n"
                    f"• ಅಂದಾಜು ಪರಿಹಾರ: ₹{payout:,.2f}*\n"
                    "ನೀವು ಈಗ ಅಧಿಕೃತ ಪಿಡಿಎಫ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿಕೊಳ್ಳಬಹುದು."
                )
            }
            return
