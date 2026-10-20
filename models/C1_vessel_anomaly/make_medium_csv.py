"""Makes a SMALLER copy of trawlers.csv for Google Colab: only the 6 needed columns, saved as a ZIP.
Reads ONE LINE AT A TIME (no pandas), so it needs almost no RAM.

Usage (repo root):
    python models\\C1_vessel_anomaly\\make_medium_csv.py data\\raw\\trawlers.csv data\\raw\\trawlers_medium.csv.zip
        -> first 400 vessels, at most 5000 pings each (small upload)
    python models\\C1_vessel_anomaly\\make_medium_csv.py data\\raw\\trawlers.csv data\\raw\\trawlers_all.csv.zip all
        -> ALL vessels, ALL rows, only 6 columns
"""
import csv
import os
import sys
import zipfile
import io

csv.field_size_limit(10 ** 7)
COLS = ["mmsi", "timestamp", "lat", "lon", "speed", "course"]
src, dst = sys.argv[1], sys.argv[2]
ALL = len(sys.argv) > 3 and sys.argv[3].lower() == "all"
MAX_VESSELS, MAX_PINGS = (None, None) if ALL else (400, 5000)

counts, kept, seen = {}, 0, 0
name = os.path.basename(dst)
inner = name[:-4] if name.lower().endswith(".zip") else name
with open(src, "r", newline="", encoding="utf-8", errors="replace") as f, \
        zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zf, \
        zf.open(inner, "w", force_zip64=True) as raw:
    out = io.TextIOWrapper(raw, encoding="utf-8", newline="")
    w = csv.writer(out, lineterminator="\n")
    rd = csv.reader(f)
    header = next(rd)
    idx = [header.index(c) for c in COLS]          # stops with a clear error if a column is missing
    w.writerow(COLS)
    mi = idx[0]
    need = max(idx)
    for row in rd:
        seen += 1
        if len(row) <= need:
            continue
        v = row[mi]
        if MAX_VESSELS is not None:
            c = counts.get(v)
            if c is None:
                if len(counts) >= MAX_VESSELS:
                    continue
                c = 0
            if c >= MAX_PINGS:
                continue
            counts[v] = c + 1
        else:
            counts[v] = 1
        w.writerow([row[i] for i in idx])
        kept += 1
        if seen % 500000 == 0:
            print("read", seen, "rows | kept", kept, "| vessels", len(counts))
    out.flush()
    out.detach()
print("Saved", kept, "rows,", len(counts), "vessels ->", dst)