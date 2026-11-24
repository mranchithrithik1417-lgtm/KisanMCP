import pytest
from backend.services.geometry import compute_plot_metrics


def test_compute_plot_metrics():
    """Verify area and perimeter calculation for a known field polygon."""
    # Approximate 100m x 100m square (approx 1 hectare = 2.47 acres, 10,000 sq m)
    # At latitude 13.0, 1 deg lat ~ 110,574m, 1 deg lon ~ 108,500m
    lat0, lon0 = 13.24000, 77.71000
    delta_lat = 100.0 / 110574.0
    delta_lon = 100.0 / 108500.0

    coords = [
        [lat0, lon0],
        [lat0 + delta_lat, lon0],
        [lat0 + delta_lat, lon0 + delta_lon],
        [lat0, lon0 + delta_lon]
    ]

    metrics = compute_plot_metrics(coords)
    assert metrics["is_valid"] is True
    assert 2.0 <= metrics["area_acres"] <= 3.0  # Approx 2.47 acres
    assert 380.0 <= metrics["perimeter_m"] <= 420.0  # Approx 400m perimeter
    assert len(metrics["digipin"]) == 12
    assert metrics["digipin"] != "N/A"


def test_invalid_polygon_points():
    """Verify ValueError when fewer than 3 coordinates provided."""
    with pytest.raises(ValueError):
        compute_plot_metrics([[13.0, 77.0], [13.1, 77.1]])
