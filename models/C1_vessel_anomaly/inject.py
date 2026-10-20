"""Synthetic anomaly injection harness (proposal section 3.2 / 3.5).

Anomalies are injected ONLY into held-out validation/test vessels, on top of REAL tracks.
Every injected ping is labelled (anom=1, anom_type). Types:
  spoof    - coordinate jump + speed spike beyond physical limits   (GPS spoofing)
  gap      - transponder silence of 20 min .. 4 h                    (AIS blackout / dark vessel)
  slowdown - 12-16 kn transit drops to 2-4 kn trawling speed         (boundary entry + fishing)
  zigzag   - erratic course oscillation (search / evasive pattern)

Injection happens BEFORE feature computation so features stay physically consistent.
"""
import numpy as np
import pandas as pd


def _free_span(g, k, rng, margin=2, tries=15):
    n = len(g)
    if n < k + 2 * margin + 2:
        return None
    for _ in range(tries):
        i = int(rng.integers(margin, n - k - margin))
        if g["anom"].iloc[max(0, i - 2):i + k + 2].sum() == 0:
            return i
    return None


def _mark(g, i, j, kind):
    g.loc[g.index[i:j], "anom"] = 1
    g.loc[g.index[i:j], "anom_type"] = kind


def spoof(g, rng):
    k = int(rng.integers(3, 7))
    i = _free_span(g, k, rng)
    if i is None:
        return g
    shift_lat = rng.uniform(0.3, 1.0) * rng.choice([-1, 1])
    shift_lon = rng.uniform(0.3, 1.0) * rng.choice([-1, 1])
    sl = g.index[i:i + k]
    g.loc[sl, "lat"] = (g.loc[sl, "lat"] + shift_lat).clip(-89, 89)
    g.loc[sl, "lon"] = g.loc[sl, "lon"] + shift_lon
    g.loc[sl, "sog"] = (g.loc[sl, "sog"] + rng.uniform(20, 30)).clip(upper=102.0)
    _mark(g, i, i + k + 1, "spoof")        # +1: the ping where the track jumps back
    return g


def gap(g, rng):
    gap_s = rng.uniform(20 * 60, 4 * 3600)
    n = len(g)
    for _ in range(15):
        i = int(rng.integers(2, max(3, n - 4)))
        t0 = g["time"].iloc[i]
        later = np.where((g["time"] >= t0 + pd.Timedelta(seconds=gap_s)).to_numpy())[0]
        later = later[later > i]
        if len(later) == 0:
            continue
        j = int(later[0])
        if g["anom"].iloc[max(0, i - 2):min(n, j + 3)].sum() > 0:
            continue
        g = pd.concat([g.iloc[:i + 1], g.iloc[j:]]).reset_index(drop=True)
        _mark(g, i, i + 2, "gap")          # ping before and ping after the silence
        return g
    return g


def slowdown(g, rng):
    k = int(rng.integers(8, 16))
    n = len(g)
    sog = g["sog"].to_numpy()
    cand = [i for i in range(2, n - k - 2) if sog[i:i + k].min() >= 8.0 and g["anom"].iloc[i - 1:i + k + 1].sum() == 0]
    if not cand:
        return g
    i = int(rng.choice(cand))
    new_sog = rng.uniform(2.0, 4.0, size=k)
    f = np.clip(new_sog / np.maximum(sog[i:i + k], 1e-3), 0, 1)
    lat = g["lat"].to_numpy().copy()
    lon = g["lon"].to_numpy().copy()
    old_last = (lat[i + k - 1], lon[i + k - 1])
    for m in range(k):                      # compress displacement so position matches the new speed
        p = i + m
        lat[p] = lat[p - 1] + f[m] * (g["lat"].iloc[p] - g["lat"].iloc[p - 1])
        lon[p] = lon[p - 1] + f[m] * (g["lon"].iloc[p] - g["lon"].iloc[p - 1])
    d_lat, d_lon = lat[i + k - 1] - old_last[0], lon[i + k - 1] - old_last[1]
    lat[i + k:] += d_lat                    # keep the rest of the track continuous
    lon[i + k:] += d_lon
    g["lat"], g["lon"] = lat, lon
    sog2 = sog.copy()
    sog2[i:i + k] = new_sog
    g["sog"] = sog2
    _mark(g, i, i + k, "slowdown")
    return g


def zigzag(g, rng):
    k = int(rng.integers(8, 13))
    i = _free_span(g, k, rng)
    if i is None:
        return g
    amp = rng.uniform(0.01, 0.03)
    sign = np.array([1 if m % 2 == 0 else -1 for m in range(k)])
    sl = g.index[i:i + k]
    g.loc[sl, "lat"] = g.loc[sl, "lat"].to_numpy() + sign * amp
    g.loc[sl, "lon"] = g.loc[sl, "lon"].to_numpy() + sign * amp
    turn = sign * rng.uniform(60, 120)
    g.loc[sl, "cog"] = (g.loc[sl, "cog"].to_numpy() + turn) % 360.0
    _mark(g, i, i + k, "zigzag")
    return g


APPLY = {"spoof": spoof, "gap": gap, "slowdown": slowdown, "zigzag": zigzag}


def inject(df, seed, frac_tracks=0.5, types=("spoof", "gap", "slowdown", "zigzag")):
    rng = np.random.default_rng(seed)
    out = []
    for _, g in df.groupby("track_id", sort=False):
        g = g.sort_values("time").reset_index(drop=True).copy()
        if rng.random() < frac_tracks:
            for _ in range(int(rng.integers(1, 4))):
                kind = str(rng.choice(list(types)))
                g = APPLY[kind](g, rng)
        out.append(g)
    return pd.concat(out, ignore_index=True)
