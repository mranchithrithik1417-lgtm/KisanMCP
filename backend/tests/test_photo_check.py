from backend.services.photo_check import check_photo_location


def test_photo_inside_polygon():
    """Verify that a photo taken strictly inside the field passes with distance 0."""
    coords = [
        [13.240, 77.710],
        [13.250, 77.710],
        [13.250, 77.720],
        [13.240, 77.720]
    ]
    # Center of this square
    inside_lat, inside_lon = 13.245, 77.715
    res = check_photo_location(coords, inside_lat, inside_lon)
    assert res["is_inside"] is True
    assert res["passed"] is True
    assert res["distance_meters"] == 0.0
    assert "inside your field" in res["message_en"]


def test_photo_near_boundary_within_400m():
    """Verify that a photo taken within 400m of the plot boundary passes."""
    coords = [
        [13.240, 77.710],
        [13.250, 77.710],
        [13.250, 77.720],
        [13.240, 77.720]
    ]
    # ~100m outside the eastern boundary (0.001 deg lon ~ 108m)
    near_lat, near_lon = 13.245, 77.721
    res = check_photo_location(coords, near_lat, near_lon)
    assert res["is_inside"] is False
    assert res["passed"] is True
    assert 50.0 <= res["distance_meters"] <= 200.0


def test_photo_far_outside_400m():
    """Verify that a photo taken > 400m away fails."""
    coords = [
        [13.240, 77.710],
        [13.250, 77.710],
        [13.250, 77.720],
        [13.240, 77.720]
    ]
    # ~2 km away (0.02 deg lat ~ 2.2 km)
    far_lat, far_lon = 13.270, 77.715
    res = check_photo_location(coords, far_lat, far_lon)
    assert res["is_inside"] is False
    assert res["passed"] is False
    assert res["distance_meters"] > 400.0
    assert "exceeds 400 m buffer" in res["message_en"]
