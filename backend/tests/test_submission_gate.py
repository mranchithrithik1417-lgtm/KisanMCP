import pytest
import datetime
from backend.db import init_db, get_or_create_farmer, save_plot, create_claim_draft, verify_and_submit_claim, get_db_connection
from mcp_server.server import submit_claim


@pytest.fixture
def setup_draft():
    """Sets up a clean test plot and draft claim."""
    init_db()
    farmer = get_or_create_farmer("9999900001", "Gate Test Farmer")
    plot = save_plot(
        farmer_id=farmer["id"],
        coords=[[13.24, 77.71], [13.25, 77.71], [13.25, 77.72], [13.24, 77.72]],
        area_acres=2.5,
        perimeter_m=400.0,
        digipin="4PC-MK3-J434",
        survey_number="Sy 101/A"
    )
    draft = create_claim_draft(
        plot_id=plot["id"],
        crop="Ragi",
        disaster_type="flood",
        disaster_date="2026-10-01",
        loss_percent_declared=70.0
    )
    return draft


def test_submit_without_token_fails(setup_draft):
    """Proves that calling submit_claim without a token is strictly rejected."""
    draft_id = setup_draft["claim_id"]

    # Empty token
    with pytest.raises(ValueError) as excinfo:
        submit_claim(draft_id=draft_id, token="")
    assert "Security Gate Rejected" in str(excinfo.value) or "Token is missing" in str(excinfo.value)


def test_submit_with_bogus_token_fails(setup_draft):
    """Proves that calling submit_claim with an invalid token fails."""
    draft_id = setup_draft["claim_id"]

    with pytest.raises(ValueError) as excinfo:
        submit_claim(draft_id=draft_id, token="TOK-FAKE-INVALID-123")
    assert "Invalid confirmation token" in str(excinfo.value)


def test_submit_with_valid_token_succeeds(setup_draft):
    """Proves that a valid unused token succeeds in submitting the claim."""
    draft_id = setup_draft["claim_id"]
    valid_token = setup_draft["token"]

    result = submit_claim(draft_id=draft_id, token=valid_token)
    assert result["status"] == "SUBMITTED"
    assert result["claim_id"] == draft_id


def test_replay_used_token_fails(setup_draft):
    """Proves that once a token is used, reusing it is strictly rejected."""
    draft_id = setup_draft["claim_id"]
    valid_token = setup_draft["token"]

    # First submit succeeds
    submit_claim(draft_id=draft_id, token=valid_token)

    # Second submit with the same token must fail
    with pytest.raises(ValueError) as excinfo:
        submit_claim(draft_id=draft_id, token=valid_token)
    assert "Token already used" in str(excinfo.value)


def test_expired_token_fails(setup_draft):
    """Proves that an expired token (> 30 mins) fails."""
    draft_id = setup_draft["claim_id"]
    token = setup_draft["token"]

    # Manually backdate expiration in DB to 1 hour ago
    conn = get_db_connection()
    cur = conn.cursor()
    past_iso = (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat()
    cur.execute("UPDATE claim_tokens SET expires_at = ? WHERE token = ?", (past_iso, token))
    conn.commit()
    conn.close()

    with pytest.raises(ValueError) as excinfo:
        submit_claim(draft_id=draft_id, token=token)
    assert "Token expired" in str(excinfo.value)
