"""Finds the part of each AIS csv that lies INSIDE Sri Lanka's EEZ box and saves it as a new csv.
Reads one line at a time (no pandas), so it works on a low-RAM laptop.

Box: lat 2.57-11.45, lon 77.02-85.23.   Output keeps the 6 columns the model needs.

Usage (repo root):
    python models\\C1_vessel_anomaly\\extract_srilanka.py data\\raw\\srilanka_from_global.csv data\\raw\\trawlers.csv
    (you may list more input files after the output name)
"""
import csv
import sys
from collections import Counter

csv.field_size_limit(10 ** 7)
LAT0, LAT1, LON0, LON1 = 2.57, 11.45, 77.02, 85.23
COLS = ["mmsi", "timestamp", "lat", "lon", "speed", "course"]
out_path, files = sys.argv[1], sys.argv[2:]
if not files:
    sys.exit("give at least one input csv")

per_ship, total, kept = Counter(), 0, 0
with open(out_path, "w", newline="") as fo:
    w = csv.writer(fo)
    w.writerow(COLS)
    for path in files:
        n_in = 0
        with open(path, "r", newline="", encoding="utf-8", errors="replace") as f:
            rd = csv.reader(f)
            header = next(rd)
            try:
                idx = [header.index(c) for c in COLS]
            except ValueError:
                print(path, ": missing a needed column. Columns are:", header)
                continue
            ilat, ilon = idx[2], idx[3]
            need = max(idx)
            for row in rd:
                total += 1
                if len(row) <= need:
                    continue
                try:
                    la, lo = float(row[ilat]), float(row[ilon])
                except ValueError:
                    continue
                if LAT0 <= la <= LAT1 and LON0 <= lo <= LON1:
                    w.writerow([row[i] for i in idx])
                    per_ship[path + "|" + row[idx[0]]] += 1
                    kept += 1
                    n_in += 1
                if total % 1000000 == 0:
                    print("read %d rows | inside Sri Lanka so far: %d" % (total, kept))
        print("%s -> %d rows inside the box" % (path, n_in))

print("\nTOTAL rows read:", total)
print("Rows inside Sri Lankan EEZ box:", kept)
print("Different ships inside:", len(per_ship))
long_ones = [k for k, v in per_ship.items() if v >= 50]
print("Ships with 50+ pings inside (usable for testing):", len(long_ones))
print("Saved ->", out_path)