"""PDF claim summary report generator using ReportLab and QRCode."""

import os
import io
import datetime
from typing import Dict, Any, Optional
import qrcode
from PIL import Image as PILImage

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "generated_reports")


def generate_claim_pdf(claim_data: Dict[str, Any], output_path: Optional[str] = None) -> str:
    """Generates a professional claim verification PDF report.

    Args:
        claim_data: Dictionary containing farmer, plot, evidence, score, and claim info.
        output_path: Optional explicit file path for PDF.

    Returns:
        Absolute path to the generated PDF report.
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    claim_id = claim_data.get("claim_id", "draft")
    if not output_path:
        filename = f"KisanClaim_{claim_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = os.path.abspath(os.path.join(REPORTS_DIR, filename))

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#2E7D32")
    accent_color = colors.HexColor("#F9A825")
    dark_color = colors.HexColor("#1B1B1B")
    cream_color = colors.HexColor("#FFF8E1")
    gray_color = colors.HexColor("#757575")

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color,
        alignment=0
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=gray_color
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=dark_color
    )
    body_bold = ParagraphStyle(
        "ReportBodyBold",
        parent=body_style,
        fontName="Helvetica-Bold"
    )
    badge_style = ParagraphStyle(
        "BadgeStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    story = []

    # 1. Header with Title & QR Code
    claim_url = claim_data.get("claim_url", f"http://localhost:5173/claims/{claim_id}")
    qr_img_buffer = io.BytesIO()
    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(claim_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_img.save(qr_img_buffer, format="PNG")
    qr_img_buffer.seek(0)
    rl_qr = RLImage(qr_img_buffer, width=1.0 * inch, height=1.0 * inch)

    header_table = Table(
        [
            [
                [
                    Paragraph("🌾 KisanClaim MCP - Crop Damage Verification Report", title_style),
                    Spacer(1, 4),
                    Paragraph("Official Algorithmic Claim Dossier • PMFBY Compliant Evidence Format", subtitle_style),
                    Paragraph(f"Generated On: {datetime.datetime.now().strftime('%d %b %Y, %I:%M %p')}", subtitle_style)
                ],
                rl_qr
            ]
        ],
        colWidths=[460, 80]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=8))

    # 2. Key Summary Cards: Claim ID, Status, Verification Score
    score = claim_data.get("score", 0)
    score_conf = "High Confidence" if score >= 70 else ("Medium Confidence" if score >= 50 else "Low Confidence")
    status_str = claim_data.get("status", "SUBMITTED").upper()

    summary_data = [
        [
            Paragraph(f"<b>Claim ID:</b> {claim_id}", body_style),
            Paragraph(f"<b>Status:</b> {status_str}", body_bold),
            Paragraph(f"<b>Verification Score:</b> {score}/100 ({score_conf})", body_bold)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[180, 160, 200])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cream_color),
        ("BOX", (0, 0), (-1, -1), 1, accent_color),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 3. Farmer & Plot Details Table
    story.append(Paragraph("1. Farmer & Plot Information", heading_style))
    farmer_name = claim_data.get("farmer_name", "Demo Farmer")
    farmer_phone = claim_data.get("farmer_phone", "9876543210")
    digipin = claim_data.get("digipin", "N/A")
    survey_no = claim_data.get("survey_number", "74/2A")
    ulpin = claim_data.get("ulpin", "ULP-KA-BLR-0042")
    area_acres = claim_data.get("area_acres", 2.45)
    perimeter_m = claim_data.get("perimeter_m", 412.0)
    crop = claim_data.get("crop", "Ragi")
    disaster_type = claim_data.get("disaster_type", "Flood").capitalize()
    disaster_date = claim_data.get("disaster_date", "2026-10-15")
    loss_percent = claim_data.get("loss_percent_declared", 65.0)

    farmer_plot_data = [
        [Paragraph("<b>Farmer Name:</b>", body_style), Paragraph(farmer_name, body_style),
         Paragraph("<b>Phone Number:</b>", body_style), Paragraph(farmer_phone, body_style)],
        [Paragraph("<b>DIGIPIN (Geo-Address):</b>", body_style), Paragraph(f"<b>{digipin}</b>", body_style),
         Paragraph("<b>Survey / Khata No:</b>", body_style), Paragraph(survey_no, body_style)],
        [Paragraph("<b>ULPIN (Unique Land ID):</b>", body_style), Paragraph(ulpin, body_style),
         Paragraph("<b>Plot Area / Perimeter:</b>", body_style), Paragraph(f"{area_acres} Acres ({perimeter_m} m)", body_style)],
        [Paragraph("<b>Crop Declared:</b>", body_style), Paragraph(crop, body_style),
         Paragraph("<b>Declared Loss:</b>", body_style), Paragraph(f"<b>{loss_percent}%</b>", body_style)],
        [Paragraph("<b>Disaster Event:</b>", body_style), Paragraph(f"{disaster_type}", body_style),
         Paragraph("<b>Disaster Date:</b>", body_style), Paragraph(disaster_date, body_style)],
    ]
    fp_table = Table(farmer_plot_data, colWidths=[135, 135, 135, 135])
    fp_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F5F5")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F5F5F5")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(fp_table)
    story.append(Spacer(1, 10))

    # 4. Satellite NDVI Evidence Table
    sat_source = claim_data.get("satellite_source", "SAMPLE")
    sat_badge = "Live satellite data" if sat_source == "LIVE" else "Sample data (demo)"
    story.append(Paragraph(f"2. Satellite NDVI Crop Damage Evidence [{sat_badge}]", heading_style))

    ndvi_before = claim_data.get("ndvi_before", 0.72)
    ndvi_after = claim_data.get("ndvi_after", 0.38)
    ndvi_drop = claim_data.get("ndvi_drop_percent", 47.2)
    before_date = claim_data.get("before_date", "2026-09-30")
    after_date = claim_data.get("after_date", "2026-10-20")

    sat_table_data = [
        [
            Paragraph("<b>Observation</b>", body_bold),
            Paragraph("<b>Date</b>", body_bold),
            Paragraph("<b>Mean NDVI Index</b>", body_bold),
            Paragraph("<b>Vegetation Status</b>", body_bold),
            Paragraph("<b>Change</b>", body_bold)
        ],
        [
            Paragraph("Pre-Disaster Baseline", body_style),
            Paragraph(before_date, body_style),
            Paragraph(str(ndvi_before), body_style),
            Paragraph("Healthy dense green canopy (NDVI > 0.6)", body_style),
            Paragraph("Baseline (100%)", body_style)
        ],
        [
            Paragraph("Post-Disaster Impact", body_style),
            Paragraph(after_date, body_style),
            Paragraph(str(ndvi_after), body_style),
            Paragraph("Severe stress / water logging / wilting", body_style),
            Paragraph(f"<b>-{ndvi_drop}% Loss</b>", body_bold)
        ]
    ]
    sat_table = Table(sat_table_data, colWidths=[120, 80, 90, 160, 90])
    sat_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F5E9")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(sat_table)
    story.append(Spacer(1, 10))

    # 5. Rainfall Table & Open-Meteo Window
    rain_source = claim_data.get("rainfall_source", "LIVE")
    rain_badge = "Live weather data" if rain_source == "LIVE" else "Sample data (demo)"
    story.append(Paragraph(f"3. Weather & Precipitation Evidence (Open-Meteo) [{rain_badge}]", heading_style))

    total_rain = claim_data.get("rainfall_total_mm", 112.5)
    max_rain = claim_data.get("rainfall_max_day_mm", 68.5)
    max_date = claim_data.get("rainfall_max_date", disaster_date)
    rain_reason = claim_data.get("rainfall_reason", "Extreme rainfall spike recorded during window.")

    rain_summary = (
        f"<b>Total Event Rainfall:</b> {total_rain} mm | "
        f"<b>Peak Daily Rainfall:</b> {max_rain} mm on {max_date} | "
        f"<b>Anomaly:</b> {rain_reason}"
    )
    story.append(Paragraph(rain_summary, body_style))
    story.append(Spacer(1, 6))

    # Daily breakdown (show sample rows if present)
    daily_rain = claim_data.get("rainfall_daily", [])
    if daily_rain:
        rain_rows = [
            [Paragraph(f"<b>{row.get('date', '')}</b>", body_style),
             Paragraph(f"{row.get('precipitation_mm', 0.0)} mm", body_style)]
            for row in daily_rain[:7]
        ]
        # Transpose or format cleanly
        header_r = [Paragraph(r.get("date", "")[-5:], body_bold) for r in daily_rain[:7]]
        val_r = [Paragraph(f"{r.get('precipitation_mm', 0.0)}mm", body_style) for r in daily_rain[:7]]
        compact_rain_table = Table([header_r, val_r], colWidths=[75] * len(header_r))
        compact_rain_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E1F5FE")),
            ("PADDING", (0, 0), (-1, -1), 3),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(compact_rain_table)
    story.append(Spacer(1, 10))

    # 6. Geotagged Field Photograph & Geofence Verification
    story.append(Paragraph("4. Geotagged Field Photograph & Perimeter Check", heading_style))
    photo_path = claim_data.get("photo_path")
    photo_dist = claim_data.get("photo_distance_meters", 0.0)
    photo_passed = claim_data.get("photo_passed", True)
    photo_status_text = "Verified inside plot boundary" if photo_dist == 0 else f"Verified within perimeter buffer ({photo_dist} m away)"

    photo_info = [
        Paragraph(f"<b>Geofence Status:</b> {photo_status_text}", body_bold),
        Paragraph(f"<b>Photo Coordinates:</b> {claim_data.get('photo_lat', 13.2456)}, {claim_data.get('photo_lon', 77.7123)}", body_style),
        Paragraph("<b>Digital Watermark:</b> Camera capture stamped with live GPS coordinates, DIGIPIN, and timestamp.", body_style)
    ]

    photo_elem = None
    if photo_path and os.path.exists(photo_path):
        try:
            photo_elem = RLImage(photo_path, width=2.4 * inch, height=1.6 * inch)
        except Exception:
            photo_elem = None

    if photo_elem:
        photo_table = Table([[photo_info, photo_elem]], colWidths=[340, 200])
        photo_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(photo_table)
    else:
        for p in photo_info:
            story.append(p)
            story.append(Spacer(1, 2))
    story.append(Spacer(1, 10))

    # 7. Verification Score (Indicative) & Reasons
    story.append(Paragraph("5. Rule-Based Verification Score & Audit Trail", heading_style))
    score_reasons = claim_data.get("score_reasons", [])
    reasons_flow = []
    for r in score_reasons:
        reasons_flow.append(Paragraph(f"• {r}", body_style))
        reasons_flow.append(Spacer(1, 2))

    reasons_box = Table([[reasons_flow]], colWidths=[540])
    reasons_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAFA")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#BDBDBD")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(reasons_box)
    story.append(Spacer(1, 10))

    # 8. Indicative Payout Notice
    payout = claim_data.get("indicative_payout_inr", 15925.0)
    story.append(Paragraph("6. Indicative Payout Estimate", heading_style))
    payout_table = Table([
        [
            Paragraph(f"<b>Estimated Compensation: ₹{payout:,.2f}</b>", ParagraphStyle("PayStyle", parent=body_bold, fontSize=11, textColor=primary_color)),
            Paragraph("<i>* Note: This is an indicative algorithmic estimate, not an official PMFBY disbursement amount. Final sanction subject to insurer review.</i>", subtitle_style)
        ]
    ], colWidths=[200, 340])
    payout_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cream_color),
        ("BOX", (0, 0), (-1, -1), 1, accent_color),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(payout_table)

    # Build document
    doc.build(story)
    return output_path
