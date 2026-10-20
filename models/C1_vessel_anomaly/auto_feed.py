"""DEMO feeder - plays the part of an AIS receiver.

It reads the recorded, labelled tracks (test_tracks.csv) and POSTs them to the backend one ping at a time,
forever (when the data ends it asks the backend to start from zero and plays it again).
In real use this script is replaced by the navy's own AIS receiver / satellite-AIS feed, which POSTs the same
JSON to  /ping.  Nothing else changes.

Needs the backend to be running:   python -m uvicorn api_server:app --port 8000
Run:    python auto_feed.py            (20 pings / second)
        python auto_feed.py 50         (50 pings / second)
Needs:  pip install requests
"""
import os
import sys
import time
from pathlib import Path

import requests

from replay import replay

HERE = Path(__file__).resolve().parent
URL = os.environ.get("C1_API", "http://localhost:8000")
RATE = float(sys.argv[1]) if len(sys.argv) > 1 else float(os.environ.get("C1_RATE", 20))
KEYS = ("mmsi", "time", "lat", "lon", "sog", "cog", "true_anom", "true_type")


def tracks_file():
    env = os.environ.get("C1_RESULTS")
    if env:
        return Path(env) / "test_tracks.csv"
    for n in ("results_colab", "results_c1_v2", "results_c1"):
        if (HERE / n / "model.pt").exists():
            return HERE / n / "test_tracks.csv"
    return HERE / "results_c1" / "test_tracks.csv"


def wait_for_backend(s):
    shown = False
    while True:
        try:
            s.get(URL + "/stats", timeout=3).raise_for_status()
            return
        except Exception:                                      # noqa: BLE001
            if not shown:
                print("waiting for the backend at %s ..." % URL)
                shown = True
            time.sleep(2)


def main():
    path = tracks_file()
    if not path.exists():
        sys.exit("Missing %s" % path)
    s = requests.Session()
    wait_for_backend(s)
    print("backend is up. Feeding %s at %.0f pings/second (Ctrl+C to stop)" % (path, RATE))
    s.post(URL + "/reset", timeout=10)
    lap, step = 1, 1.0 / RATE
    while True:
        n, t_next = 0, time.perf_counter()
        for p in replay(str(path)):
            try:
                s.post(URL + "/ping", json={k: p[k] for k in KEYS}, timeout=10)
            except Exception:                                  # noqa: BLE001 - backend restarting: wait, then go on
                wait_for_backend(s)
                continue
            n += 1
            t_next += step                                     # keeps the rate steady even if a request is slow
            time.sleep(max(0.0, t_next - time.perf_counter()))
            if n % 500 == 0:
                print("lap %d: %d pings sent" % (lap, n))
        print("lap %d finished (%d pings). Starting again in 5 s ..." % (lap, n))
        time.sleep(5)
        s.post(URL + "/reset", timeout=10)
        lap += 1


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("stopped")
