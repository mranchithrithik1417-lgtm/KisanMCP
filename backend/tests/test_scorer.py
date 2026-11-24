from backend.services.scorer import compute_verification_score, compute_indicative_payout


def test_perfect_verification_score():
    """Verify max score 100 when all rules match."""
    # NDVI drop 45% (>=30% -> +35)
    # Rainfall anomaly matched (+30)
    # Photo passed (+25)
    # Loss 50% vs NDVI 45% (diff 5 <= 20 -> +10)
    # Total = 35 + 30 + 25 + 10 = 100
    res = compute_verification_score(
        ndvi_drop_percent=45.0,
        rainfall_anomaly_matched=True,
        photo_passed=True,
        declared_loss_percent=50.0
    )
    assert res["score"] == 100
    assert res["confidence"] == "High"
    assert len(res["reasons"]) == 4
    for reason in res["reasons"]:
        assert len(reason) > 10


def test_partial_verification_score():
    """Verify partial scoring under varied evidence."""
    # NDVI drop 20% (15-30% -> +20)
    # Rainfall anomaly False (+0)
    # Photo passed (+25)
    # Loss 30% vs NDVI 20% (diff 10 <= 20 -> +10)
    # Total = 20 + 0 + 25 + 10 = 55
    res = compute_verification_score(
        ndvi_drop_percent=20.0,
        rainfall_anomaly_matched=False,
        photo_passed=True,
        declared_loss_percent=30.0
    )
    assert res["score"] == 55
    assert res["confidence"] == "Medium"


def test_indicative_payout_calculation():
    """Verify payout calculation: acres * scale_of_finance * loss% / 100."""
    payout = compute_indicative_payout(area_acres=2.5, declared_loss_percent=60.0, scale_of_finance=10000.0)
    # 2.5 * 10000 * 0.60 = 15,000.0
    assert payout["indicative_payout_inr"] == 15000.0
    assert "indicative estimate, not an official pmfby amount" in payout["disclaimer"].lower()
