"""Database initialization, schema management, and CRUD helper operations for SQLite."""

import sqlite3
import os
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "kisanclaim.db")


def get_db_connection(db_path: str = DB_FILE) -> sqlite3.Connection:
    """Returns a connection to SQLite with row factory set to sqlite3.Row."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str = DB_FILE):
    """Initializes database schema."""
    conn = get_db_connection(db_path)
    cur = conn.cursor()

    # 1. Farmers table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS farmers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Plots table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS plots (
            id TEXT PRIMARY KEY,
            farmer_id TEXT NOT NULL,
            polygon_json TEXT NOT NULL,
            area_acres REAL NOT NULL,
            area_sq_m REAL,
            perimeter_m REAL NOT NULL,
            digipin TEXT NOT NULL,
            survey_number TEXT NOT NULL,
            ulpin TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmer_id) REFERENCES farmers(id)
        )
    """)

    # 3. Claims table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            id TEXT PRIMARY KEY,
            farmer_id TEXT NOT NULL,
            plot_id TEXT NOT NULL,
            crop TEXT NOT NULL,
            disaster_type TEXT NOT NULL,
            disaster_date TEXT NOT NULL,
            loss_percent_declared REAL NOT NULL,
            ndvi_before REAL,
            ndvi_after REAL,
            ndvi_drop_percent REAL,
            satellite_source TEXT,
            rainfall_total_mm REAL,
            rainfall_max_day_mm REAL,
            rainfall_max_date TEXT,
            rainfall_source TEXT,
            rainfall_reason TEXT,
            rainfall_daily_json TEXT,
            photo_path TEXT,
            photo_lat REAL,
            photo_lon REAL,
            photo_distance_meters REAL,
            photo_passed INTEGER,
            score INTEGER,
            score_reasons_json TEXT,
            indicative_payout_inr REAL,
            status TEXT NOT NULL, -- DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
            insurer_notes TEXT,
            pdf_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmer_id) REFERENCES farmers(id),
            FOREIGN KEY (plot_id) REFERENCES plots(id)
        )
    """)

    # 4. Confirmation tokens for claims
    cur.execute("""
        CREATE TABLE IF NOT EXISTS claim_tokens (
            token TEXT PRIMARY KEY,
            claim_id TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (claim_id) REFERENCES claims(id)
        )
    """)

    # 5. MCP Tool Audit Log
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tool_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_name TEXT NOT NULL,
            inputs_json TEXT NOT NULL,
            result_summary TEXT NOT NULL,
            claim_id TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 6. Rainfall Cache
    cur.execute("""
        CREATE TABLE IF NOT EXISTS rainfall_cache (
            cache_key TEXT PRIMARY KEY,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


# Database helper methods
def log_tool_call(tool_name: str, inputs: Dict[str, Any], result_summary: str, claim_id: Optional[str] = None):
    """Logs tool call to tool_audit_log table."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO tool_audit_log (tool_name, inputs_json, result_summary, claim_id) VALUES (?, ?, ?, ?)",
            (tool_name, json.dumps(inputs), result_summary, claim_id)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log tool call: {e}")


def get_audit_logs(limit: int = 100, claim_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns recent tool audit logs."""
    conn = get_db_connection()
    cur = conn.cursor()
    if claim_id:
        cur.execute(
            "SELECT * FROM tool_audit_log WHERE claim_id = ? ORDER BY id DESC LIMIT ?",
            (claim_id, limit)
        )
    else:
        cur.execute("SELECT * FROM tool_audit_log ORDER BY id DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_or_create_farmer(phone: str, name: str) -> Dict[str, Any]:
    """Retrieves or creates a farmer by phone number."""
    phone_clean = phone.strip()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM farmers WHERE phone = ?", (phone_clean,))
    row = cur.fetchone()
    if row:
        farmer = dict(row)
        conn.close()
        return farmer

    farmer_id = f"FMR-{uuid.uuid4().hex[:8].upper()}"
    cur.execute(
        "INSERT INTO farmers (id, name, phone) VALUES (?, ?, ?)",
        (farmer_id, name.strip(), phone_clean)
    )
    conn.commit()
    cur.execute("SELECT * FROM farmers WHERE id = ?", (farmer_id,))
    new_farmer = dict(cur.fetchone())
    conn.close()
    return new_farmer


def get_farmer_plot(farmer_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves the primary or most recent saved plot for a farmer."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM plots WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 1", (farmer_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        plot = dict(row)
        plot["polygon"] = json.loads(plot["polygon_json"])
        return plot
    return None


def save_plot(
    farmer_id: str,
    coords: List[List[float]],
    area_acres: float,
    perimeter_m: float,
    digipin: str,
    survey_number: str,
    ulpin: Optional[str] = None,
    plot_id: Optional[str] = None
) -> Dict[str, Any]:
    """Saves or updates a farmer plot."""
    conn = get_db_connection()
    cur = conn.cursor()
    if not plot_id:
        plot_id = f"PLT-{uuid.uuid4().hex[:8].upper()}"

    cur.execute(
        """
        INSERT OR REPLACE INTO plots 
        (id, farmer_id, polygon_json, area_acres, perimeter_m, digipin, survey_number, ulpin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            plot_id,
            farmer_id,
            json.dumps(coords),
            area_acres,
            perimeter_m,
            digipin,
            survey_number.strip(),
            (ulpin or "").strip()
        )
    )
    conn.commit()
    cur.execute("SELECT * FROM plots WHERE id = ?", (plot_id,))
    row = cur.fetchone()
    conn.close()
    plot = dict(row)
    plot["polygon"] = coords
    return plot


def create_claim_draft(
    plot_id: str,
    crop: str,
    disaster_type: str,
    disaster_date: str,
    loss_percent_declared: float,
    evidence_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Creates a draft claim with a one-time confirmation token."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Find farmer from plot
    cur.execute("SELECT farmer_id, area_acres FROM plots WHERE id = ?", (plot_id,))
    plot_row = cur.fetchone()
    if not plot_row:
        conn.close()
        raise ValueError(f"Plot not found: {plot_id}")

    farmer_id = plot_row["farmer_id"]
    area_acres = plot_row["area_acres"]

    claim_id = f"CLM-{uuid.uuid4().hex[:8].upper()}"
    token_str = f"TOK-{uuid.uuid4().hex[:12].upper()}"
    expires_at = datetime.datetime.now() + datetime.timedelta(minutes=30)

    evidence = evidence_data or {}

    cur.execute(
        """
        INSERT INTO claims (
            id, farmer_id, plot_id, crop, disaster_type, disaster_date, loss_percent_declared,
            ndvi_before, ndvi_after, ndvi_drop_percent, satellite_source,
            rainfall_total_mm, rainfall_max_day_mm, rainfall_max_date, rainfall_source, rainfall_reason, rainfall_daily_json,
            photo_path, photo_lat, photo_lon, photo_distance_meters, photo_passed,
            score, score_reasons_json, indicative_payout_inr, status
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, 'DRAFT'
        )
        """,
        (
            claim_id, farmer_id, plot_id, crop, disaster_type, disaster_date, loss_percent_declared,
            evidence.get("ndvi_before"), evidence.get("ndvi_after"), evidence.get("ndvi_drop_percent"), evidence.get("satellite_source"),
            evidence.get("rainfall_total_mm"), evidence.get("rainfall_max_day_mm"), evidence.get("rainfall_max_date"), evidence.get("rainfall_source"), evidence.get("rainfall_reason"), json.dumps(evidence.get("rainfall_daily", [])),
            evidence.get("photo_path"), evidence.get("photo_lat"), evidence.get("photo_lon"), evidence.get("photo_distance_meters"), 1 if evidence.get("photo_passed") else 0,
            evidence.get("score"), json.dumps(evidence.get("score_reasons", [])), evidence.get("indicative_payout_inr"),
        )
    )

    cur.execute(
        "INSERT INTO claim_tokens (token, claim_id, expires_at, used) VALUES (?, ?, ?, 0)",
        (token_str, claim_id, expires_at.isoformat())
    )

    conn.commit()
    conn.close()

    return {
        "claim_id": claim_id,
        "token": token_str,
        "status": "DRAFT",
        "expires_in_minutes": 30,
        "summary": (
            f"Draft created for {crop} damaged by {disaster_type} on {disaster_date}. "
            f"Declared loss: {loss_percent_declared}%. Confirmation token issued."
        )
    }


def verify_and_submit_claim(draft_id: str, token: str) -> Dict[str, Any]:
    """Validates the confirmation token and submits the claim."""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM claim_tokens WHERE token = ? AND claim_id = ?",
        (token.strip(), draft_id.strip())
    )
    token_row = cur.fetchone()

    if not token_row:
        conn.close()
        raise ValueError("Invalid confirmation token: Token does not exist or does not match claim.")

    if token_row["used"] == 1:
        conn.close()
        raise ValueError("Token already used: This confirmation token has already been consumed.")

    expires_at = datetime.datetime.fromisoformat(token_row["expires_at"])
    if datetime.datetime.now() > expires_at:
        conn.close()
        raise ValueError("Token expired: Confirmation tokens are valid for 30 minutes only.")

    # Mark token used
    cur.execute("UPDATE claim_tokens SET used = 1 WHERE token = ?", (token.strip(),))

    # Mark claim as SUBMITTED
    now_iso = datetime.datetime.now().isoformat()
    cur.execute(
        "UPDATE claims SET status = 'SUBMITTED', updated_at = ? WHERE id = ?",
        (now_iso, draft_id.strip())
    )
    conn.commit()

    cur.execute("SELECT * FROM claims WHERE id = ?", (draft_id.strip(),))
    claim_row = dict(cur.fetchone())
    conn.close()

    return {
        "claim_id": draft_id,
        "status": "SUBMITTED",
        "submitted_at": now_iso,
        "message": "Claim successfully verified and submitted to insurer queue."
    }


def get_claim(claim_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full claim record by ID."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.*, f.name as farmer_name, f.phone as farmer_phone,
               p.digipin, p.survey_number, p.ulpin, p.area_acres, p.perimeter_m, p.polygon_json
        FROM claims c
        JOIN farmers f ON c.farmer_id = f.id
        JOIN plots p ON c.plot_id = p.id
        WHERE c.id = ?
        """,
        (claim_id.strip(),)
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("score_reasons_json"):
        try:
            d["score_reasons"] = json.loads(d["score_reasons_json"])
        except Exception:
            d["score_reasons"] = []
    if d.get("rainfall_daily_json"):
        try:
            d["rainfall_daily"] = json.loads(d["rainfall_daily_json"])
        except Exception:
            d["rainfall_daily"] = []
    if d.get("polygon_json"):
        try:
            d["polygon"] = json.loads(d["polygon_json"])
        except Exception:
            d["polygon"] = []
    return d


def get_all_claims(farmer_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves claims list, optionally filtered by farmer_id."""
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
        SELECT c.*, f.name as farmer_name, f.phone as farmer_phone,
               p.digipin, p.survey_number, p.area_acres
        FROM claims c
        JOIN farmers f ON c.farmer_id = f.id
        JOIN plots p ON c.plot_id = p.id
    """
    if farmer_id:
        query += " WHERE c.farmer_id = ? ORDER BY c.created_at DESC"
        cur.execute(query, (farmer_id,))
    else:
        query += " ORDER BY c.created_at DESC"
        cur.execute(query)

    rows = cur.fetchall()
    conn.close()
    claims = []
    for r in rows:
        d = dict(r)
        if d.get("score_reasons_json"):
            try:
                d["score_reasons"] = json.loads(d["score_reasons_json"])
            except Exception:
                d["score_reasons"] = []
        claims.append(d)
    return claims


def update_claim_status(claim_id: str, new_status: str, insurer_notes: str = "") -> Dict[str, Any]:
    """Updates claim status (APPROVED, REJECTED, UNDER_REVIEW)."""
    conn = get_db_connection()
    cur = conn.cursor()
    now_iso = datetime.datetime.now().isoformat()
    cur.execute(
        "UPDATE claims SET status = ?, insurer_notes = ?, updated_at = ? WHERE id = ?",
        (new_status.upper(), insurer_notes.strip(), now_iso, claim_id.strip())
    )
    conn.commit()
    conn.close()
    return {"claim_id": claim_id, "status": new_status.upper(), "notes": insurer_notes}
