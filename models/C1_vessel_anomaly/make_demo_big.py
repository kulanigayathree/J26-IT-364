"""Make the demo bigger: every recorded TRIP becomes its own vessel on the map (instead of 8 vessels with many trips).

It reads results_colab/test_tracks.csv (real tracks of vessels the model never saw, with the labelled injected anomalies),
cuts every trip down to a few hundred pings around its anomaly (so a lap is short and every anomaly type shows up), gives each
trip its own vessel id, and writes the result back as test_tracks.csv. The original is kept as test_tracks_original.csv,
so running this again always starts from the original.

    python make_demo_big.py                (from models\\C1_vessel_anomaly)
    python make_demo_big.py results_colab 450      # folder, max pings per trip

Be honest on the panel: the vessels are real unseen tracks; "more vessels" means more trips, not more accuracy.
"""
import os
import shutil
import sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
folder = os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else "results_colab")
MAXP = int(sys.argv[2]) if len(sys.argv) > 2 else 450
cur = os.path.join(folder, "test_tracks.csv")
orig = os.path.join(folder, "test_tracks_original.csv")
if not os.path.exists(orig):
    shutil.copy(cur, orig)
df = pd.read_csv(orig)
df["anom_type"] = df["anom_type"].fillna("")
parts, vid = [], 1
for tid, g in df.groupby("track_id", sort=False):
    g = g.reset_index(drop=True)
    if len(g) < 60:
        continue
    pos = np.where(g["anom"].to_numpy() == 1)[0]
    if len(pos) and len(g) > MAXP:
        a = int(pos[0])
        lo = int(np.clip(a - int(MAXP * 0.45), 0, len(g) - MAXP))
        g = g.iloc[lo:lo + MAXP]
    elif len(g) > MAXP:
        g = g.iloc[:MAXP]
    g = g.copy()
    g["mmsi"] = 900000000 + vid                       # own vessel id for this trip
    vid += 1
    parts.append(g)
out = pd.concat(parts, ignore_index=True)
out.to_csv(cur, index=False)
n_anom = out.groupby("mmsi")["anom"].max().sum()
print("vessels (trips): %d | pings: %d | trips with an injected anomaly: %d" % (out["mmsi"].nunique(), len(out), n_anom))
print("anomaly types in the demo (trips):")
for k, v in out[out["anom"] == 1].groupby("anom_type")["mmsi"].nunique().items():
    print("   %-9s %d" % (k, v))
print("written:", cur, "(original kept as test_tracks_original.csv)")
print("at 20 pings/s one lap takes about %.0f minutes; use  python auto_feed.py 60  for a faster lap." % (len(out) / 20 / 60))