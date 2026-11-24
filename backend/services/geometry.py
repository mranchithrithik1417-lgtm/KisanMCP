"""Geometry service for computing plot area, perimeter, and center DIGIPIN using Shapely."""

from typing import List, Tuple, Dict, Any
from shapely.geometry import Polygon, Point
import pyproj
from shapely.ops import transform
from .digipin import encode_digipin

SQ_METERS_PER_ACRE = 4046.8564224


def get_projector(center_lat: float, center_lon: float):
    """Returns a transformer from EPSG:4326 to a local Azimuthal Equidistant projection in meters."""
    proj_aeqd = f"+proj=aeqd +lat_0={center_lat} +lon_0={center_lon} +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
    transformer = pyproj.Transformer.from_crs("EPSG:4326", proj_aeqd, always_xy=True)
    return transformer.transform


def compute_plot_metrics(coords: List[List[float]]) -> Dict[str, Any]:
    """Computes area in acres, perimeter in meters, center coordinates, and DIGIPIN.

    Args:
        coords: List of [lat, lon] or (lat, lon) coordinates representing plot corners.
                May be 4 or more points, closed or open.
    """
    if len(coords) < 3:
        raise ValueError("At least 3 coordinates required to form a polygon")

    # Standardize to (lon, lat) tuples for Shapely
    lon_lat_list = [(float(pt[1]), float(pt[0])) for pt in coords]
    # Ensure closed ring for polygon if needed
    if lon_lat_list[0] != lon_lat_list[-1]:
        lon_lat_list.append(lon_lat_list[0])

    poly = Polygon(lon_lat_list)
    if not poly.is_valid:
        poly = poly.buffer(0)

    center_lon = poly.centroid.x
    center_lat = poly.centroid.y

    # Project to metric coordinates
    project_func = get_projector(center_lat, center_lon)
    projected_poly = transform(project_func, poly)

    area_sq_m = float(projected_poly.area)
    perimeter_m = float(projected_poly.length)
    area_acres = area_sq_m / SQ_METERS_PER_ACRE

    try:
        digipin = encode_digipin(center_lat, center_lon)
    except Exception:
        digipin = "N/A"

    return {
        "area_acres": round(area_acres, 3),
        "area_sq_m": round(area_sq_m, 1),
        "perimeter_m": round(perimeter_m, 1),
        "center_lat": round(center_lat, 6),
        "center_lon": round(center_lon, 6),
        "digipin": digipin,
        "is_valid": poly.is_valid
    }
