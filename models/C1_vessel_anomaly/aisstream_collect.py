"""Collects LIVE AIS positions around Sri Lanka from AISStream.io and appends them to a CSV.

Let it run for hours/days (laptop on, internet on). Output columns match c1_config.yaml
(mmsi, timestamp, lat, lon, speed, course), so it can be fed straight to run_c1.py.

Setup (once):
    pip install websockets
Run (in cmd; the key is typed ONLY in your own window, never in chat):
    set AISSTREAM_KEY=your_key_here
    python aisstream_collect.py data\\raw\\srilanka_live.csv

Stop with Ctrl+C. Re-running appends to the same file.
Coverage depends on AISStream's land receivers: expect good data near the coast, little far offshore.
"""
import asyncio
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone

import websockets

# lat, lon corners that cover Sri Lanka and its EEZ (south-west corner, north-east corner)
BOX = [[[2.5, 76.0], [12.5, 87.5]]]
URL = "wss://stream.aisstream.io/v0/stream"
HEADER = ["mmsi", "timestamp", "lat", "lon", "speed", "course"]


def parse_time(s):
    """'2026-10-19 02:09:11.123456 +0000 UTC' -> unix seconds (int)."""
    dt = datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


async def run(out_path, key):
    new_file = not os.path.exists(out_path) or os.path.getsize(out_path) == 0
    n, last_report = 0, time.time()
    with open(out_path, "a", newline="") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(HEADER)
        while True:                                       # reconnect forever
            try:
                async with websockets.connect(URL, ping_interval=20) as ws:
                    await ws.send(json.dumps({"APIKey": key, "BoundingBoxes": BOX,
                                              "FilterMessageTypes": ["PositionReport"]}))
                    print("connected, waiting for ships ...")
                    async for raw in ws:
                        m = json.loads(raw)
                        if "error" in m:
                            print("server says:", m["error"])
                            return
                        if m.get("MessageType") != "PositionReport":
                            continue
                        p = m["Message"]["PositionReport"]
                        meta = m["MetaData"]
                        sog, cog = p.get("Sog"), p.get("Cog")
                        if sog is None or cog is None or sog > 102.2 or cog >= 360:   # 'not available' codes
                            continue
                        w.writerow([int(meta["MMSI"]), parse_time(meta["time_utc"]),
                                    meta["latitude"], meta["longitude"], sog, cog])
                        n += 1
                        if n % 20 == 0:
                            f.flush()
                        if time.time() - last_report > 60:
                            print("%s  rows saved: %d" % (time.strftime("%H:%M:%S"), n))
                            last_report = time.time()
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
    out = sys.argv[1] if len(sys.argv) > 1 else "srilanka_live.csv"
    try:
        asyncio.get_event_loop().run_until_complete(run(out, key))
    except KeyboardInterrupt:
        print("stopped. file:", out)