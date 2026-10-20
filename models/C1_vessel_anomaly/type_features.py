"""Shared helpers for naming the KIND of unusual behaviour in a window of pings.

A window = last 10 pings of one vessel, as raw features [log_dt, sog, cog_sin, cog_cos, rot, accel, implied_kn]
(exactly the arrays features.make_windows produces and the streaming engine builds).
"""
import numpy as np

CLASSES = ["normal", "Spoofing", "Gap (AIS off)", "Slowdown", "Zigzag"]      # index = features.ANOM_CODES value


def window_vector(w):
    """Summary numbers of one window (n, 7) -> 1-D vector the type classifier reads."""
    w = np.asarray(w, dtype=np.float64)
    dt, sog, implied = np.expm1(w[:, 0]), w[:, 1], np.expm1(w[:, 6])
    heading = np.degrees(np.arctan2(w[:, 2], w[:, 3]))
    turn = np.abs(((np.diff(heading) + 180.0) % 360.0) - 180.0)
    flips = int(((np.diff(np.sign(((np.diff(heading) + 180.0) % 360.0) - 180.0)) != 0) & (turn[1:] > 30)).sum()) if len(turn) > 2 else 0
    parts = []
    for j in range(w.shape[1]):
        c = w[:, j]
        parts += [c.min(), c.max(), c.mean(), c.std()]
    parts += [dt.max(), implied.max(), sog.max() - sog.min(), float((turn > 45).sum()), float(flips), turn.mean()]
    return np.array(parts, dtype=np.float32)


def rule_type(rows):
    """Simple physical rules (used as a comparison and as a fallback). rows: (n, 7) raw features."""
    r = np.asarray(rows, dtype=np.float64)
    if len(r) < 3:
        return "Unusual behaviour"
    dt, sog, implied = np.expm1(r[:, 0]), r[:, 1], np.expm1(r[:, 6])
    if implied.max() > 60 or sog.max() > 40:
        return "Spoofing"
    if dt.max() >= 1200:
        return "Gap (AIS off)"
    heading = np.degrees(np.arctan2(r[:, 2], r[:, 3]))
    turn = np.abs(((np.diff(heading) + 180.0) % 360.0) - 180.0)
    if (turn > 45).sum() >= 4:
        return "Zigzag"
    if sog.max() >= 8 and sog.min() < 5 and sog.max() - sog.min() >= 6:
        return "Slowdown"
    return "Unusual behaviour"