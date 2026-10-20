"""FAKE track generator, ONLY to check that the code runs end to end.
Never use output of this file for results, figures or the thesis."""
import numpy as np
import pandas as pd


def make_demo_csv(path, n_vessels=150, n_pings=300, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    t_base = pd.Timestamp("2025-03-01", tz="UTC")
    for v in range(n_vessels):
        mmsi = 200000000 + v
        lat, lon = 28.0 + rng.uniform(-1, 1), -90.0 + rng.uniform(-1, 1)
        cog = rng.uniform(0, 360)
        sog = rng.uniform(6, 14)
        t = t_base + pd.Timedelta(seconds=float(rng.integers(0, 3600)))
        for _ in range(n_pings):
            dt = float(np.exp(rng.uniform(np.log(30), np.log(600))))
            cog = (cog + rng.normal(0, 4)) % 360
            sog = float(np.clip(sog + rng.normal(0, 0.3), 2, 18))
            step_nm = sog * dt / 3600.0
            lat += step_nm * np.cos(np.radians(cog)) / 60.0
            lon += step_nm * np.sin(np.radians(cog)) / (60.0 * max(np.cos(np.radians(lat)), 0.2))
            t = t + pd.Timedelta(seconds=dt)
            rows.append((mmsi, t.strftime("%Y-%m-%d %H:%M:%S"), lat, lon, sog, cog))
    pd.DataFrame(rows, columns=["MMSI", "BaseDateTime", "LAT", "LON", "SOG", "COG"]).to_csv(path, index=False)
