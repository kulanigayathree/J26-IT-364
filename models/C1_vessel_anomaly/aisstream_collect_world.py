"""Collects LIVE AIS positions of FISHING VESSELS from all over the world (AISStream.io) into a CSV.

Why world-wide: AISStream has no receivers near Sri Lanka, but our model is not tied to one sea, so the
live feed shows the same system working on real, current vessels.

Run it before you go to sleep (laptop on, internet on, charger in). The key is typed ONLY in your own window:
    pip install websockets
    set AISSTREAM_KEY=your_key_here
    python aisstream_collect_world.py data\\raw\\world_live.csv

Stop with Ctrl+C. Re-running appends to the same file.

How it keeps the file small and useful:
  * Static messages tell us each vessel's type; only FISHING vessels (AIS type 30) are kept.
  * At most one ping per vessel every MIN_STEP_S seconds (default 30 s).
  * It stops by itself after MAX_HOURS (default 12 h) or MAX_ROWS rows, whichever comes first.
Output columns: mmsi, timestamp, lat, lon, speed, course  (same as c1_config.yaml).
"""
import asyncio
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone

import websockets

URL = "wss://stream.aisstream.io/v0/stream"
BOX = [[[-90.0, -180.0], [90.0, 180.0]]]               # the whole world
HEADER = ["mmsi", "timestamp", "lat", "lon", "speed", "course"]
FISHING = 30
MIN_STEP_S = int(os.environ.get("MIN_STEP_S", 30))
MAX_HOURS = float(os.environ.get("MAX_HOURS", 12))
MAX_ROWS = int(os.environ.get("MAX_ROWS", 3_000_000))


def parse_time(s):
    """'2026-10-19 02:09:11.123456 +0000 UTC' -> unix seconds (int)."""
    dt = datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


class Filter:
    """Pure logic (no network): decides which messages become CSV rows."""

    def __init__(self, min_step=MIN_STEP_S):
        self.min_step = min_step
        self.vtype = {}                                    # mmsi -> AIS ship type
        self.last_t = {}                                   # mmsi -> last saved unix time

    def handle(self, m):
        """Return a CSV row (list) or None."""
        kind = m.get("MessageType")
        meta = m.get("MetaData", {})
        if kind == "ShipStaticData":
            t = m["Message"]["ShipStaticData"].get("Type")
            if t is not None:
                self.vtype[int(meta["MMSI"])] = int(t)
            return None
        if kind != "PositionReport":
            return None
        mmsi = int(meta["MMSI"])
        if self.vtype.get(mmsi) != FISHING:
            return None
        p = m["Message"]["PositionReport"]
        sog, cog = p.get("Sog"), p.get("Cog")
        if sog is None or cog is None or sog > 102.2 or cog >= 360:      # 'not available' codes
            return None
        t = parse_time(meta["time_utc"])
        if t - self.last_t.get(mmsi, -10 ** 12) < self.min_step:
            return None
        self.last_t[mmsi] = t
        return [mmsi, t, meta["latitude"], meta["longitude"], sog, cog]


async def run(out_path, key):
    flt = Filter()
    new_file = not os.path.exists(out_path) or os.path.getsize(out_path) == 0
    n, t_start, last_report = 0, time.time(), time.time()
    with open(out_path, "a", newline="") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(HEADER)
        while True:                                       # reconnect forever
            try:
                async with websockets.connect(URL, ping_interval=20, max_size=None) as ws:
                    await ws.send(json.dumps({"APIKey": key, "BoundingBoxes": BOX,
                                              "FilterMessageTypes": ["PositionReport", "ShipStaticData"]}))
                    print("connected. Waiting for fishing vessels (the first ones appear after a few minutes) ...")
                    async for raw in ws:
                        m = json.loads(raw)
                        if "error" in m:
                            print("server says:", m["error"])
                            return
                        row = flt.handle(m)
                        if row:
                            w.writerow(row)
                            n += 1
                            if n % 50 == 0:
                                f.flush()
                        now = time.time()
                        if now - last_report > 60:
                            print("%s  fishing vessels seen: %d   rows saved: %d" % (
                                time.strftime("%H:%M:%S"),
                                sum(1 for v in flt.vtype.values() if v == FISHING), n))
                            last_report = now
                        if n >= MAX_ROWS or (now - t_start) / 3600.0 >= MAX_HOURS:
                            f.flush()
                            print("limit reached - stopping. rows:", n)
                            return
            except KeyboardInterrupt:
                raise
            except Exception as e:                        # network hiccup -> wait, retry
                print("connection lost (%s). retrying in 10 s ..." % e)
                f.flush()
                await asyncio.sleep(10)


if __name__ == "__main__":
    key = os.environ.get("AISSTREAM_KEY")
    if not key:
        sys.exit("Set the key first:   set AISSTREAM_KEY=your_key_here")
    out = sys.argv[1] if len(sys.argv) > 1 else "world_live.csv"
    try:
        asyncio.run(run(out, key))
    except KeyboardInterrupt:
        print("stopped. file:", out)
