"""Rainfall evidence service using Open-Meteo Archive API with SQLite caching and anomaly detection."""

import os
import json
import sqlite3
import datetime
from typing import Dict, Any, List, Optional
import httpx

CACHE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "kisanclaim.db")


def init_rainfall_cache(db_path: str = CACHE_DB_PATH):
    """Initializes rainfall cache table in SQLite."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS rainfall_cache (
            cache_key TEXT PRIMARY KEY,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def get_cached_rainfall(cache_key: str, db_path: str = CACHE_DB_PATH) -> Optional[Dict[str, Any]]:
    """Retrieves cached rainfall data if present."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM rainfall_cache WHERE cache_key = ?", (cache_key,))
        row = cur.fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
    except Exception:
        pass
    return None


def store_cached_rainfall(cache_key: str, data: Dict[str, Any], db_path: str = CACHE_DB_PATH):
    """Stores rainfall data in SQLite cache."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO rainfall_cache (cache_key, data_json) VALUES (?, ?)",
            (cache_key, json.dumps(data))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def generate_sample_rainfall(
    lat: float, lon: float, start_date: str, end_date: str, disaster_type: str = "flood"
) -> Dict[str, Any]:
    """Generates deterministic sample rainfall when API is offline or in DEMO_MODE."""
    # Deterministic generation based on lat, lon, dates
    start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
    end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
    days_count = max(1, (end_dt - start_dt).days + 1)

    daily_series: List[Dict[str, Any]] = []
    total_mm = 0.0
    max_day_mm = 0.0
    max_day_date = start_date

    is_flood = disaster_type.lower() == "flood"
    is_drought = disaster_type.lower() == "drought"

    for i in range(days_count):
        curr_dt = start_dt + datetime.timedelta(days=i)
        date_str = curr_dt.isoformat()

        # Place the spike around the middle of the window for floods
        mid_point = days_count // 2
        if is_flood:
            if i == mid_point:
                mm = 68.5  # Flash flood spike > 50mm
            elif abs(i - mid_point) == 1:
                mm = 24.0
            else:
                mm = round(2.0 + (hash(f"{lat}_{lon}_{date_str}") % 10) * 0.5, 1)
        elif is_drought:
            mm = 0.0 if (i % 3 != 0) else 0.5
        else:
            mm = round(5.0 + (hash(f"{lat}_{lon}_{date_str}") % 25) * 1.0, 1)

        total_mm += mm
        if mm > max_day_mm:
            max_day_mm = mm
            max_day_date = date_str

        daily_series.append({"date": date_str, "precipitation_mm": mm})

    return evaluate_anomalies(
        daily_series=daily_series,
        total_mm=round(total_mm, 1),
        max_day_mm=round(max_day_mm, 1),
        max_day_date=max_day_date,
        disaster_type=disaster_type,
        source="SAMPLE"
    )


def evaluate_anomalies(
    daily_series: List[Dict[str, Any]],
    total_mm: float,
    max_day_mm: float,
    max_day_date: str,
    disaster_type: str,
    source: str
) -> Dict[str, Any]:
    """Applies domain rules to verify rainfall anomalies."""
    disaster_type_clean = disaster_type.lower()
    has_daily_spike = max_day_mm >= 50.0
    has_flood_window_excess = total_mm >= 100.0
    has_drought_deficit = total_mm < 10.0

    if disaster_type_clean == "flood":
        is_anomaly = has_daily_spike or has_flood_window_excess
        if has_daily_spike:
            anomaly_reason = f"Extreme rainfall spike: {max_day_mm} mm recorded on {max_day_date} (threshold >= 50 mm)"
        elif has_flood_window_excess:
            anomaly_reason = f"Heavy accumulated rainfall: {total_mm} mm over the event window (threshold >= 100 mm)"
        else:
            anomaly_reason = f"Normal rainfall: {total_mm} mm total (max day {max_day_mm} mm), no flood threshold met"
    elif disaster_type_clean == "drought":
        is_anomaly = has_drought_deficit
        if is_anomaly:
            anomaly_reason = f"Severe rainfall deficit: {total_mm} mm over event window (threshold < 10 mm)"
        else:
            anomaly_reason = f"Moderate rainfall: {total_mm} mm total, deficit threshold (< 10 mm) not met"
    else:
        # Hail, pest, storm, etc.
        is_anomaly = has_daily_spike or has_flood_window_excess
        anomaly_reason = f"Recorded {total_mm} mm total with max daily precipitation of {max_day_mm} mm"

    return {
        "source": source,
        "daily": daily_series,
        "total_mm": total_mm,
        "max_day_mm": max_day_mm,
        "max_day_date": max_day_date,
        "disaster_type": disaster_type,
        "is_anomaly": is_anomaly,
        "anomaly_reason": anomaly_reason
    }


def get_rainfall_data(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    disaster_type: str = "flood",
    force_sample: bool = False
) -> Dict[str, Any]:
    """Fetches rainfall from Open-Meteo Archive API or cache with graceful SAMPLE fallback."""
    init_rainfall_cache()
    cache_key = f"{round(lat, 4)}_{round(lon, 4)}_{start_date}_{end_date}_{disaster_type.lower()}"

    if force_sample or os.getenv("DEMO_MODE", "false").lower() == "true":
        return generate_sample_rainfall(lat, lon, start_date, end_date, disaster_type)

    cached = get_cached_rainfall(cache_key)
    if cached:
        return cached

    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&"
        f"daily=precipitation_sum&timezone=Asia%2FKolkata"
    )

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                daily = data.get("daily", {})
                dates = daily.get("time", [])
                precip = daily.get("precipitation_sum", [])

                daily_series = []
                total_mm = 0.0
                max_day_mm = 0.0
                max_day_date = start_date

                for d, p in zip(dates, precip):
                    val = round(float(p or 0.0), 1)
                    daily_series.append({"date": d, "precipitation_mm": val})
                    total_mm += val
                    if val > max_day_mm:
                        max_day_mm = val
                        max_day_date = d

                result = evaluate_anomalies(
                    daily_series=daily_series,
                    total_mm=round(total_mm, 1),
                    max_day_mm=round(max_day_mm, 1),
                    max_day_date=max_day_date,
                    disaster_type=disaster_type,
                    source="LIVE"
                )
                store_cached_rainfall(cache_key, result)
                return result
    except Exception:
        # Fall back gracefully to sample on any network/API issue
        pass

    sample_result = generate_sample_rainfall(lat, lon, start_date, end_date, disaster_type)
    return sample_result
