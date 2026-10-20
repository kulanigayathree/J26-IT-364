"""Replay recorded (labelled) AIS tracks as if they were arriving live.

This is a SIMULATED feed: it takes results_c1/test_tracks.csv (real GFW tracks that contain the
synthetic anomalies injected into the held-out test vessels) and yields one ping at a time,
interleaving many vessels like a real receiver would.
"""
import pandas as pd


def replay(tracks_csv, concurrency=25):
    df = pd.read_csv(tracks_csv)
    try:
        df["time"] = pd.to_datetime(df["time"], utc=True)
    except ValueError:                              # mixed formats (newer pandas is stricter)
        df["time"] = pd.to_datetime(df["time"], utc=True, format="ISO8601")
    df["anom_type"] = df["anom_type"].fillna("")
    streams = []                                   # one time-ordered stream per vessel
    for mmsi, g in df.groupby("mmsi"):
        g = g.sort_values("time")
        streams.append(g[["mmsi", "time", "lat", "lon", "sog", "cog", "anom", "anom_type"]].to_dict("records"))

    active, nxt = [], 0
    while True:
        while len(active) < concurrency and nxt < len(streams):
            active.append([streams[nxt], 0])
            nxt += 1
        if not active:
            return
        for item in list(active):
            rows, i = item
            r = rows[i]
            yield {"mmsi": r["mmsi"], "time": r["time"].isoformat(), "lat": r["lat"], "lon": r["lon"],
                   "sog": r["sog"], "cog": r["cog"], "true_anom": int(r["anom"]), "true_type": r["anom_type"]}
            item[1] += 1
            if item[1] >= len(rows):
                active.remove(item)
