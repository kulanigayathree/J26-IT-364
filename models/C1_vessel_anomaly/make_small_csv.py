import sys

import pandas as pd

MAX_VESSELS = 60
MAX_PINGS = 4000

src, dst = sys.argv[1], sys.argv[2]
counts, parts = {}, []
for ch in pd.read_csv(src, chunksize=200000):
    for v in ch["mmsi"].unique():
        if len(counts) >= MAX_VESSELS:
            break
        counts.setdefault(v, 0)
    ch = ch[ch["mmsi"].isin(list(counts))]
    prior = ch["mmsi"].map(counts).fillna(0)
    ch = ch[(ch.groupby("mmsi").cumcount() + prior) < MAX_PINGS]
    for v, n in ch["mmsi"].value_counts().items():
        counts[v] += int(n)
    parts.append(ch)
    print("rows kept so far:", sum(len(p) for p in parts), "| vessels:", len(counts))

out = pd.concat(parts, ignore_index=True)
out.to_csv(dst, index=False)
print("Saved", len(out), "rows,", out["mmsi"].nunique(), "vessels ->", dst)