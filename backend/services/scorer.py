"""Rule-based verification scoring engine and indicative payout calculation."""

from typing import Dict, Any, List
import os

DEFAULT_SCALE_OF_FINANCE = 10000.0


def compute_verification_score(
    ndvi_drop_percent: float,
    rainfall_anomaly_matched: bool,
    photo_passed: bool,
    declared_loss_percent: float,
    rainfall_reason: str = ""
) -> Dict[str, Any]:
    """Calculates rule-based verification score (0 to 100) and produces plain explanations.

    Rules:
    - Base: 0
    - NDVI drop >= 30%: +35 points (15% to 30%: +20 points)
    - Rainfall anomaly matches disaster type: +30 points
    - Photo inside plot or within 400m: +25 points
    - Declared loss within 20 points of NDVI drop: +10 points
    - Max cap: 100
    """
    score = 0
    reasons: List[str] = []

    # 1. NDVI drop rule
    if ndvi_drop_percent >= 30.0:
        score += 35
        reasons.append(f"Satellite evidence confirms severe crop loss: NDVI dropped by {ndvi_drop_percent}% (+35 pts).")
    elif ndvi_drop_percent >= 15.0:
        score += 20
        reasons.append(f"Satellite evidence confirms moderate crop loss: NDVI dropped by {ndvi_drop_percent}% (+20 pts).")
    else:
        reasons.append(f"Satellite NDVI drop was low ({ndvi_drop_percent}%), showing limited vegetation change (+0 pts).")

    # 2. Rainfall anomaly rule
    if rainfall_anomaly_matched:
        score += 30
        rain_detail = f" ({rainfall_reason})" if rainfall_reason else ""
        reasons.append(f"Weather data confirms extreme rainfall anomaly matching disaster{rain_detail} (+30 pts).")
    else:
        reasons.append("Rainfall records do not show an anomalous extreme event during the disaster window (+0 pts).")

    # 3. Photo check rule
    if photo_passed:
        score += 25
        reasons.append("Geotagged field photograph verified inside or within 400 m of plot boundary (+25 pts).")
    else:
        reasons.append("Field photograph GPS coordinates exceed the 400 m field boundary perimeter (+0 pts).")

    # 4. Consistency rule: declared loss vs NDVI drop
    diff = abs(declared_loss_percent - ndvi_drop_percent)
    if diff <= 20.0:
        score += 10
        reasons.append(
            f"Farmer declared loss ({declared_loss_percent}%) aligns within 20% of satellite NDVI drop ({ndvi_drop_percent}%) (+10 pts)."
        )
    else:
        reasons.append(
            f"Declared loss ({declared_loss_percent}%) differs by {round(diff, 1)}% from satellite NDVI loss (+0 pts)."
        )

    final_score = min(100, max(0, score))

    return {
        "score": final_score,
        "max_score": 100,
        "reasons": reasons,
        "label": "indicative",
        "confidence": "High" if final_score >= 70 else ("Medium" if final_score >= 50 else "Low")
    }


def compute_indicative_payout(
    area_acres: float,
    declared_loss_percent: float,
    scale_of_finance: float = None
) -> Dict[str, Any]:
    """Computes indicative payout estimate.

    Formula: area_acres * SCALE_OF_FINANCE_PER_ACRE * loss_percent / 100
    """
    if scale_of_finance is None:
        try:
            scale_of_finance = float(os.getenv("SCALE_OF_FINANCE_PER_ACRE", str(DEFAULT_SCALE_OF_FINANCE)))
        except Exception:
            scale_of_finance = DEFAULT_SCALE_OF_FINANCE

    payout_inr = round(area_acres * scale_of_finance * (declared_loss_percent / 100.0), 2)

    return {
        "indicative_payout_inr": payout_inr,
        "area_acres": area_acres,
        "loss_percent": declared_loss_percent,
        "scale_of_finance_per_acre": scale_of_finance,
        "disclaimer": "Indicative estimate, not an official PMFBY amount"
    }
