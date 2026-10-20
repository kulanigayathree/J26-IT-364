"""Throughput / scalability benchmark for the streaming engine (proposal NFR1, NFR2, NFR4).

    python bench_throughput.py --res results_colab --vessels 2000 --rounds 20

It feeds synthetic pings of N simultaneous vessels straight into StreamEngine (no network) and measures
messages per second, per-message latency (mean / p95 / p99) and memory. Be honest in the report: this is a single
Python process on THIS computer; the proposal target is 10,000 msg/s.
"""
import argparse
import os
import sys
import time

import numpy as np
import psutil

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from stream_engine import StreamEngine  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--res", required=True)
ap.add_argument("--vessels", type=int, default=2000)
ap.add_argument("--rounds", type=int, default=20, help="pings per vessel")
a = ap.parse_args()

eng = StreamEngine(a.res)
proc = psutil.Process(os.getpid())
rng = np.random.default_rng(0)
N = a.vessels
lat = rng.uniform(5, 10, N)
lon = rng.uniform(79, 82, N)
cog = rng.uniform(0, 360, N)
sog = rng.uniform(5, 12, N)
t = 1_700_000_000.0
lats = []
mem0 = proc.memory_info().rss / 1e6
n_msg = 0
t_all = time.perf_counter()
for r in range(a.rounds):
    t += 60.0
    for v in range(N):
        cog[v] = (cog[v] + rng.normal(0, 3)) % 360
        step = sog[v] * 60.0 / 3600.0
        lat[v] += step * np.cos(np.radians(cog[v])) / 60.0
        lon[v] += step * np.sin(np.radians(cog[v])) / 60.0
        t0 = time.perf_counter()
        eng.process({"mmsi": 400000000 + v, "time": t, "lat": float(lat[v]), "lon": float(lon[v]),
                     "sog": float(sog[v]), "cog": float(cog[v])})
        lats.append((time.perf_counter() - t0) * 1000.0)
        n_msg += 1
el = time.perf_counter() - t_all
lats = np.array(lats)
scored = lats[N * 10:]                                    # after the 10-ping warm-up of every vessel
print("\n=== RESULT (single process, this computer) ===")
print("vessels tracked at once : %d" % len(eng.state))
print("messages processed      : %d in %.1f s  ->  %.0f messages / second" % (n_msg, el, n_msg / el))
print("per-message latency (ms): mean %.2f | p95 %.2f | p99 %.2f | max %.1f   (target < 500 ms)" % (
    scored.mean(), np.quantile(scored, .95), np.quantile(scored, .99), scored.max()))
print("memory                  : %.0f MB before -> %.0f MB after (%d vessels)" % (mem0, proc.memory_info().rss / 1e6, len(eng.state)))
print("targets in proposal     : 10,000 msg/s (NFR1) | 2,000 vessels (NFR4) | < 500 ms (NFR2)")