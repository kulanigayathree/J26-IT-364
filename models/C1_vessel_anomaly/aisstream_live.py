"""LIVE AIS client: listens to AISStream.io (free, world-wide, real-time) and forwards the pings to the backend.

   AISStream (live)  ->  this client  ->  POST /ping (api_server.py)  ->  model  ->  dashboard

Needs the backend to be running and a free key from aisstream.io. The key is typed ONLY in your own window:
    pip install websockets requests
    set AISSTREAM_KEY=your_key_here
    python aisstream_live.py            (fishing vessels only - the model was trained on trawlers)
    python aisstream_live.py --all      (every vessel type; the map fills at once, but cargo ships are not trawlers)

Honest notes: there are no AISStream receivers near Sri Lanka; live pings have no labels, so no accuracy can
be measured on them (accuracy comes from the labelled replay). Fishing vessels are recognised from the ship-type
message, which each vessel sends every few minutes, so the first dots appear after a short wait.
"""
import asyncio
import json
import os
import queue
import sys
import threading
import time

import requests
import websockets

from aisstream_collect_world import Filter, URL, BOX

API = os.environ.get("C1_API", "http://localhost:8000")
ALL_TYPES = "--all" in sys.argv
Q = queue.Queue(maxsize=5000)
STATS = {"sent": 0, "failed": 0}


def poster():
    """Background thread: sends rows to the backend so a slow request never blocks the websocket."""
    s = requests.Session()
    while True:
        row = Q.get()
        body = {"mmsi": row[0], "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(row[1])),
                "lat": row[2], "lon": row[3], "sog": row[4], "cog": row[5]}
        try:
            s.post(API + "/ping", json=body, timeout=10).raise_for_status()
            STATS["sent"] += 1
        except Exception:                                              # noqa: BLE001
            STATS["failed"] += 1


class AllFilter(Filter):
    """Same as Filter, but keeps every vessel type."""

    def handle(self, m):
        if m.get("MessageType") == "PositionReport":
            self.vtype[int(m["MetaData"]["MMSI"])] = 30            # pretend 'fishing' so the parent logic keeps it
        return super().handle(m)


async def run(key):
    flt = AllFilter() if ALL_TYPES else Filter()
    last = time.time()
    while True:                                                    # reconnect forever
        try:
            async with websockets.connect(URL, ping_interval=20, max_size=None) as ws:
                await ws.send(json.dumps({"APIKey": key, "BoundingBoxes": BOX,
                                          "FilterMessageTypes": ["PositionReport", "ShipStaticData"]}))
                print("connected to AISStream. %s" % ("Forwarding all vessels." if ALL_TYPES else
                                                      "Waiting for fishing vessels (first dots after a few minutes) ..."))
                async for raw in ws:
                    m = json.loads(raw)
                    if "error" in m:
                        print("AISStream says:", m["error"])
                        return
                    row = flt.handle(m)
                    if row:
                        try:
                            Q.put_nowait(row)
                        except queue.Full:
                            pass                                   # backend is behind: drop, stay live
                    if time.time() - last > 30:
                        print("%s  sent to backend: %d   failed: %d   vessels known: %d" % (
                            time.strftime("%H:%M:%S"), STATS["sent"], STATS["failed"], len(flt.last_t)))
                        last = time.time()
        except KeyboardInterrupt:
            raise
        except Exception as e:                                     # noqa: BLE001
            print("connection lost (%s). retrying in 10 s ..." % e)
            await asyncio.sleep(10)


if __name__ == "__main__":
    key = os.environ.get("AISSTREAM_KEY")
    if not key:
        sys.exit("Set the key first:   set AISSTREAM_KEY=your_key_here")
    threading.Thread(target=poster, daemon=True).start()
    try:
        asyncio.run(run(key))
    except KeyboardInterrupt:
        print("stopped")
