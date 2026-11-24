"""Photo location verification service.

Validates whether captured photo coordinates fall within the farmer's plot
or within an acceptable 400m perimeter buffer.
"""

from typing import List, Dict, Any
from shapely.geometry import Polygon, Point
from shapely.ops import transform
from .geometry import get_projector

MAX_ALLOWED_DISTANCE_METERS = 400.0


def check_photo_location(plot_coords: List[List[float]], photo_lat: float, photo_lon: float) -> Dict[str, Any]:
    """Checks if a photo location is inside the plot polygon or within 400m of it.

    Args:
        plot_coords: List of [lat, lon] coordinates representing the plot boundary.
        photo_lat: Latitude of the geotagged photo.
        photo_lon: Longitude of the geotagged photo.

    Returns:
        Dict containing:
            - distance_meters: Distance from plot boundary in meters (0 if inside).
            - is_inside: Boolean indicating if photo is directly inside the polygon.
            - passed: Boolean indicating if inside or within 400m.
            - message_en: Human-readable English status.
            - message_kn: Human-readable Kannada status.
    """
    if len(plot_coords) < 3:
        raise ValueError("Invalid plot boundary: polygon must have at least 3 points")

    lon_lat_list = [(float(pt[1]), float(pt[0])) for pt in plot_coords]
    if lon_lat_list[0] != lon_lat_list[-1]:
        lon_lat_list.append(lon_lat_list[0])

    poly = Polygon(lon_lat_list)
    if not poly.is_valid:
        poly = poly.buffer(0)

    center_lat = poly.centroid.y
    center_lon = poly.centroid.x

    # Project to metric coordinates
    project_func = get_projector(center_lat, center_lon)
    projected_poly = transform(project_func, poly)

    photo_pt = Point(float(photo_lon), float(photo_lat))
    projected_photo_pt = transform(project_func, photo_pt)

    is_inside = bool(projected_poly.contains(projected_photo_pt))

    if is_inside:
        distance_meters = 0.0
        passed = True
        msg_en = "Photo is inside your field"
        msg_kn = "ಭಾವಚಿತ್ರವು ನಿಮ್ಮ ಜಮೀನಿನ ಒಳಗಿದೆ"
    else:
        # Distance to boundary in meters
        distance_meters = float(projected_poly.exterior.distance(projected_photo_pt))
        passed = distance_meters <= MAX_ALLOWED_DISTANCE_METERS
        if passed:
            msg_en = f"Photo is near your field ({round(distance_meters, 1)} m away, within 400 m buffer)"
            msg_kn = f"ಭಾವಚಿತ್ರವು ನಿಮ್ಮ ಜಮೀನಿನ ಸಮೀಪದಲ್ಲಿದೆ ({round(distance_meters, 1)} ಮೀಟರ್ ದೂರದಲ್ಲಿದೆ)"
        else:
            msg_en = f"Photo is far from your field ({round(distance_meters, 1)} m away - exceeds 400 m buffer)"
            msg_kn = f"ಭಾವಚಿತ್ರವು ನಿಮ್ಮ ಜಮೀನಿನಿಂದ ಬಹಳ ದೂರದಲ್ಲಿದೆ ({round(distance_meters, 1)} ಮೀ ದೂರ)"

    return {
        "distance_meters": round(distance_meters, 1),
        "is_inside": is_inside,
        "passed": passed,
        "max_buffer_meters": MAX_ALLOWED_DISTANCE_METERS,
        "message_en": msg_en,
        "message_kn": msg_kn
    }
