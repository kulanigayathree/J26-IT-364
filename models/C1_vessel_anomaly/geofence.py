"""EEZ geofence (proposal FR3): is a position inside the Sri Lankan EEZ?  Pure numpy, no GIS library needed.

The polygon file is a GeoJSON (Polygon / MultiPolygon, longitude-latitude) of the Sri Lankan EEZ, e.g. from Marine Regions.
Put it at  data/raw/sri_lanka_eez.geojson  (or set the C1_EEZ environment variable). Without the file everything keeps
working, the geofence is simply switched off.
"""
import json
import os

import numpy as np


class Geofence:
    def __init__(self, path):
        with open(path, encoding="utf-8") as f:
            gj = json.load(f)
        geoms = []
        if gj.get("type") == "FeatureCollection":
            geoms = [ft["geometry"] for ft in gj["features"] if ft.get("geometry")]
        elif gj.get("type") == "Feature":
            geoms = [gj["geometry"]]
        else:
            geoms = [gj]
        self.polys = []                     # each: (outer ring Nx2, [hole rings])
        for g in geoms:
            if g["type"] == "Polygon":
                polys = [g["coordinates"]]
            elif g["type"] == "MultiPolygon":
                polys = g["coordinates"]
            else:
                continue
            for p in polys:
                self.polys.append((np.asarray(p[0], dtype=np.float64)[:, :2],
                                   [np.asarray(h, dtype=np.float64)[:, :2] for h in p[1:]]))
        if not self.polys:
            raise ValueError("no polygon found in " + path)
        allp = np.vstack([p[0] for p in self.polys])
        self.bbox = (allp[:, 0].min(), allp[:, 1].min(), allp[:, 0].max(), allp[:, 1].max())   # W S E N
        self.path = path

    @staticmethod
    def _in_ring(lon, lat, ring):
        x, y = ring[:, 0], ring[:, 1]
        x2, y2 = np.roll(x, -1), np.roll(y, -1)
        cond = (y > lat) != (y2 > lat)
        with np.errstate(divide="ignore", invalid="ignore"):
            xint = (x2 - x) * (lat - y) / (y2 - y) + x
        return bool((cond & (lon < xint)).sum() % 2)       # ray casting: odd number of crossings = inside

    def contains(self, lon, lat):
        w, s, e, n = self.bbox
        if not (w <= lon <= e and s <= lat <= n):           # cheap rejection first
            return False
        for outer, holes in self.polys:
            if self._in_ring(lon, lat, outer) and not any(self._in_ring(lon, lat, h) for h in holes):
                return True
        return False

    def rings(self):
        """Outer rings as lists of [lon, lat] (for drawing on the map)."""
        return [p[0].tolist() for p in self.polys]


def default_path(here):
    env = os.environ.get("C1_EEZ")
    if env:
        return env
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(here))))     # J26-IT-364 (3 levels above this file)
    return os.path.join(root, "data", "raw", "sri_lanka_eez.geojson")


def load_default(here):
    p = default_path(here)
    if os.path.exists(p):
        try:
            return Geofence(p)
        except Exception:                                   # noqa: BLE001
            return None
    return None