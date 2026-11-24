"""Seed script to populate database with demo farmer, plot in Devanahalli, Karnataka, and historical demo claims."""

import os
import json
import datetime
from .db import init_db, get_or_create_farmer, save_plot, get_db_connection
from .services.geometry import compute_plot_metrics
from .services.scorer import compute_verification_score, compute_indicative_payout
from .services.pdf_generator import generate_claim_pdf


def run_seed():
    """Seeds database with initial demo data."""
    print("[INFO] Initializing database schema...")
    init_db()

    print("[INFO] Creating seeded demo farmer 'Ravi Kumar' (9876543210)...")
    farmer = get_or_create_farmer(phone="9876543210", name="Ravi Kumar")
    farmer_id = farmer["id"]

    # Devanahalli Plot Coordinates (~13.2456 N, 77.7123 E)
    # A realistic 4-corner agricultural field in Devanahalli, Karnataka
    devanahalli_coords = [
        [13.2462, 77.7118],
        [13.2464, 77.7132],
        [13.2448, 77.7135],
        [13.2446, 77.7121]
    ]

    metrics = compute_plot_metrics(devanahalli_coords)
    print(f"[INFO] Saving plot near Devanahalli: {metrics['area_acres']} Acres, DIGIPIN {metrics['digipin']}...")

    plot = save_plot(
        farmer_id=farmer_id,
        coords=devanahalli_coords,
        area_acres=metrics["area_acres"],
        perimeter_m=metrics["perimeter_m"],
        digipin=metrics["digipin"],
        survey_number="Devanahalli Sy. 84/3",
        ulpin="ULPIN-KA-BLR-DEV-1082",
        plot_id="PLT-DEMO-DEVANAHALLI"
    )
    plot_id = plot["id"]

    conn = get_db_connection()
    cur = conn.cursor()

    # Clean previous demo claims to keep it idempotent
    cur.execute("DELETE FROM claims WHERE id IN ('CLM-DEMO-001', 'CLM-DEMO-002')")

    # 1. Past Claim 1: APPROVED flood claim (Kharif season)
    score_1 = compute_verification_score(
        ndvi_drop_percent=48.5,
        rainfall_anomaly_matched=True,
        photo_passed=True,
        declared_loss_percent=60.0,
        rainfall_reason="Extreme rainfall spike: 72.0 mm on 2026-08-14"
    )
    payout_1 = compute_indicative_payout(metrics["area_acres"], 60.0)

    claim_1_data = {
        "claim_id": "CLM-DEMO-001",
        "farmer_name": farmer["name"],
        "farmer_phone": farmer["phone"],
        "digipin": metrics["digipin"],
        "survey_number": "Devanahalli Sy. 84/3",
        "ulpin": "ULPIN-KA-BLR-DEV-1082",
        "area_acres": metrics["area_acres"],
        "perimeter_m": metrics["perimeter_m"],
        "crop": "Ragi (Finger Millet)",
        "disaster_type": "Flood",
        "disaster_date": "2026-08-14",
        "loss_percent_declared": 60.0,
        "ndvi_before": 0.72,
        "ndvi_after": 0.37,
        "ndvi_drop_percent": 48.5,
        "satellite_source": "SAMPLE",
        "before_date": "2026-08-01",
        "after_date": "2026-08-25",
        "rainfall_total_mm": 134.0,
        "rainfall_max_day_mm": 72.0,
        "rainfall_max_date": "2026-08-14",
        "rainfall_source": "SAMPLE",
        "rainfall_reason": "Flash flood threshold exceeded (>50mm/day)",
        "score": score_1["score"],
        "score_reasons": score_1["reasons"],
        "indicative_payout_inr": payout_1["indicative_payout_inr"],
        "status": "APPROVED",
        "photo_lat": 13.2455,
        "photo_lon": 77.7124,
        "photo_distance_meters": 0.0,
        "photo_passed": True
    }
    pdf_path_1 = generate_claim_pdf(claim_1_data)

    cur.execute(
        """
        INSERT INTO claims (
            id, farmer_id, plot_id, crop, disaster_type, disaster_date, loss_percent_declared,
            ndvi_before, ndvi_after, ndvi_drop_percent, satellite_source,
            rainfall_total_mm, rainfall_max_day_mm, rainfall_max_date, rainfall_source, rainfall_reason,
            photo_lat, photo_lon, photo_distance_meters, photo_passed,
            score, score_reasons_json, indicative_payout_inr, status, insurer_notes, pdf_path, created_at
        ) VALUES (
            'CLM-DEMO-001', ?, ?, 'Ragi (Finger Millet)', 'Flood', '2026-08-14', 60.0,
            0.72, 0.37, 48.5, 'SAMPLE',
            134.0, 72.0, '2026-08-14', 'SAMPLE', 'Flash flood threshold exceeded (>50mm/day)',
            13.2455, 77.7124, 0.0, 1,
            ?, ?, ?, 'APPROVED', 'Approved by Senior Surveyor. Satellite and rainfall anomalies match reported inundation.', ?, '2026-08-20 14:30:00'
        )
        """,
        (
            farmer_id, plot_id, score_1["score"], json.dumps(score_1["reasons"]),
            payout_1["indicative_payout_inr"], pdf_path_1
        )
    )

    # 2. Past Claim 2: UNDER_REVIEW drought claim
    score_2 = compute_verification_score(
        ndvi_drop_percent=32.0,
        rainfall_anomaly_matched=True,
        photo_passed=True,
        declared_loss_percent=45.0,
        rainfall_reason="Precipitation deficit (< 10 mm in 21 days)"
    )
    payout_2 = compute_indicative_payout(metrics["area_acres"], 45.0)

    claim_2_data = {
        "claim_id": "CLM-DEMO-002",
        "farmer_name": farmer["name"],
        "farmer_phone": farmer["phone"],
        "digipin": metrics["digipin"],
        "survey_number": "Devanahalli Sy. 84/3",
        "ulpin": "ULPIN-KA-BLR-DEV-1082",
        "area_acres": metrics["area_acres"],
        "perimeter_m": metrics["perimeter_m"],
        "crop": "Groundnut",
        "disaster_type": "Drought",
        "disaster_date": "2026-09-10",
        "loss_percent_declared": 45.0,
        "ndvi_before": 0.65,
        "ndvi_after": 0.44,
        "ndvi_drop_percent": 32.0,
        "satellite_source": "SAMPLE",
        "before_date": "2026-08-20",
        "after_date": "2026-09-20",
        "rainfall_total_mm": 6.5,
        "rainfall_max_day_mm": 2.1,
        "rainfall_max_date": "2026-09-02",
        "rainfall_source": "SAMPLE",
        "rainfall_reason": "Dry spell exceeding 20 days with total under 10mm",
        "score": score_2["score"],
        "score_reasons": score_2["reasons"],
        "indicative_payout_inr": payout_2["indicative_payout_inr"],
        "status": "UNDER_REVIEW",
        "photo_lat": 13.2458,
        "photo_lon": 77.7126,
        "photo_distance_meters": 12.0,
        "photo_passed": True
    }
    pdf_path_2 = generate_claim_pdf(claim_2_data)

    cur.execute(
        """
        INSERT INTO claims (
            id, farmer_id, plot_id, crop, disaster_type, disaster_date, loss_percent_declared,
            ndvi_before, ndvi_after, ndvi_drop_percent, satellite_source,
            rainfall_total_mm, rainfall_max_day_mm, rainfall_max_date, rainfall_source, rainfall_reason,
            photo_lat, photo_lon, photo_distance_meters, photo_passed,
            score, score_reasons_json, indicative_payout_inr, status, insurer_notes, pdf_path, created_at
        ) VALUES (
            'CLM-DEMO-002', ?, ?, 'Groundnut', 'Drought', '2026-09-10', 45.0,
            0.65, 0.44, 32.0, 'SAMPLE',
            6.5, 2.1, '2026-09-02', 'SAMPLE', 'Dry spell exceeding 20 days with total under 10mm',
            13.2458, 77.7126, 12.0, 1,
            ?, ?, ?, 'UNDER_REVIEW', 'Awaiting field inspector secondary signoff on soil moisture.', ?, '2026-09-25 10:15:00'
        )
        """,
        (
            farmer_id, plot_id, score_2["score"], json.dumps(score_2["reasons"]),
            payout_2["indicative_payout_inr"], pdf_path_2
        )
    )

    conn.commit()
    conn.close()
    print("[SUCCESS] Seed completed successfully! Created 1 demo farmer, 1 plot, and 2 claims.")


if __name__ == "__main__":
    run_seed()
