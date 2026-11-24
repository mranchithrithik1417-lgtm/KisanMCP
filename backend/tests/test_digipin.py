import math
import pytest
from backend.services.digipin import encode_digipin, decode_digipin, MIN_LAT, MAX_LAT, MIN_LON, MAX_LON


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def test_digipin_format():
    """Verify DIGIPIN format is XXX-XXX-XXXX with 10 alphanumeric characters."""
    lat, lon = 13.2456, 77.7123  # Devanahalli
    pin = encode_digipin(lat, lon)
    assert len(pin) == 12  # 10 chars + 2 hyphens
    assert pin[3] == "-"
    assert pin[7] == "-"
    parts = pin.split("-")
    assert len(parts) == 3
    assert len(parts[0]) == 3
    assert len(parts[1]) == 3
    assert len(parts[2]) == 4


def test_digipin_round_trip_accuracy():
    """Verify encode then decode lands within a few metres of original point."""
    test_points = [
        (13.2456, 77.7123),  # Devanahalli, Karnataka
        (12.9716, 77.5946),  # Bengaluru
        (28.6139, 77.2090),  # New Delhi
        (19.0760, 72.8777),  # Mumbai
    ]

    for lat, lon in test_points:
        encoded = encode_digipin(lat, lon)
        dec_lat, dec_lon = decode_digipin(encoded)
        dist_m = haversine_distance_meters(lat, lon, dec_lat, dec_lon)
        # At 10 levels (4^10 divisions), resolution is approximately 3-4 meters
        assert dist_m <= 10.0, f"Round trip error too high: {dist_m}m for point ({lat}, {lon})"


def test_digipin_out_of_bounds():
    """Verify coordinates outside the India bounding box raise ValueError."""
    with pytest.raises(ValueError):
        encode_digipin(1.0, 77.0)  # Below MIN_LAT (2.5)

    with pytest.raises(ValueError):
        encode_digipin(40.0, 77.0)  # Above MAX_LAT (38.5)

    with pytest.raises(ValueError):
        encode_digipin(13.0, 60.0)  # West of MIN_LON (63.5)

    with pytest.raises(ValueError):
        encode_digipin(13.0, 102.0)  # East of MAX_LON (99.5)
