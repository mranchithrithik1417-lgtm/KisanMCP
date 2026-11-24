"""DIGIPIN (Digital Postal Index Number) service for geo-addressing.

Specification:
Bounding box: lat 2.5 to 38.5, lon 63.5 to 99.5
4x4 hierarchical grid with 10 levels.
Format: XXX-XXX-XXXX (with hyphens after 3rd and 6th characters).

Note: Verify against India Post's official DIGIPIN specification before real use.
"""

from typing import Tuple
import math

MIN_LAT = 2.5
MAX_LAT = 38.5
MIN_LON = 63.5
MAX_LON = 99.5

# Row 0 is North/top, Row 3 is South/bottom
GRID = [
    ['F', 'C', '9', '8'],
    ['J', '3', '2', '7'],
    ['K', '4', '5', '6'],
    ['L', 'M', 'P', 'T']
]

# Reverse map for decoding
CHAR_TO_POS = {}
for r_idx, row in enumerate(GRID):
    for c_idx, char in enumerate(row):
        CHAR_TO_POS[char] = (r_idx, c_idx)


def encode_digipin(lat: float, lon: float, levels: int = 10) -> str:
    """Encodes a lat/lon coordinate into a 10-level DIGIPIN string (e.g. XXX-XXX-XXXX)."""
    if not (MIN_LAT <= lat <= MAX_LAT and MIN_LON <= lon <= MAX_LON):
        raise ValueError(
            f"Coordinates ({lat}, {lon}) outside India bounding box: "
            f"lat [{MIN_LAT}, {MAX_LAT}], lon [{MIN_LON}, {MAX_LON}]"
        )

    min_lat, max_lat = MIN_LAT, MAX_LAT
    min_lon, max_lon = MIN_LON, MAX_LON
    chars = []

    for _ in range(levels):
        lat_step = (max_lat - min_lat) / 4.0
        lon_step = (max_lon - min_lon) / 4.0

        # Row 0 is the top/north row:
        row = 3 - int(math.floor((lat - min_lat) / lat_step))
        col = int(math.floor((lon - min_lon) / lon_step))

        # Clamp boundaries if on upper edges
        row = max(0, min(3, row))
        col = max(0, min(3, col))

        chars.append(GRID[row][col])

        # Shrink bounding box to current cell
        # Compute new bounds using old min before updating
        new_min_lat = min_lat + (3 - row) * lat_step
        new_max_lat = new_min_lat + lat_step
        new_min_lon = min_lon + col * lon_step
        new_max_lon = new_min_lon + lon_step

        min_lat, max_lat = new_min_lat, new_max_lat
        min_lon, max_lon = new_min_lon, new_max_lon

    raw = "".join(chars)
    # Insert hyphens after 3rd and 6th character
    return f"{raw[:3]}-{raw[3:6]}-{raw[6:]}"


def decode_digipin(digipin: str) -> Tuple[float, float]:
    """Decodes a DIGIPIN string back to the center lat/lon of its bounding box."""
    clean = digipin.replace("-", "").strip().upper()
    if len(clean) != 10:
        raise ValueError(f"DIGIPIN must be 10 characters (got {len(clean)})")

    min_lat, max_lat = MIN_LAT, MAX_LAT
    min_lon, max_lon = MIN_LON, MAX_LON

    for char in clean:
        if char not in CHAR_TO_POS:
            raise ValueError(f"Invalid character in DIGIPIN: {char}")
        row, col = CHAR_TO_POS[char]

        lat_step = (max_lat - min_lat) / 4.0
        lon_step = (max_lon - min_lon) / 4.0

        new_min_lat = min_lat + (3 - row) * lat_step
        new_max_lat = new_min_lat + lat_step
        new_min_lon = min_lon + col * lon_step
        new_max_lon = new_min_lon + lon_step

        min_lat, max_lat = new_min_lat, new_max_lat
        min_lon, max_lon = new_min_lon, new_max_lon

    center_lat = (min_lat + max_lat) / 2.0
    center_lon = (min_lon + max_lon) / 2.0
    return round(center_lat, 6), round(center_lon, 6)
