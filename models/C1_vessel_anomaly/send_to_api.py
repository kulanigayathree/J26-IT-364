"""Feeds the replay into the API, one ping at a time (the 'input source' of the demo).
Run in a 2nd window while api_server is running:   python send_to_api.py [pings_per_second]
Needs:  pip install requests
"""
import os
import sys
import time

import requests

from replay import replay

URL = os.environ.get("C1_API", "http://localhost:8000")
rate = float(sys.argv[1]) if len(sys.argv) > 1 else 20.0
res = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results_c1", "test_tracks.csv")
n = 0
for p in replay(res):
    body = {k: p[k] for k in ("mmsi", "time", "lat", "lon", "sog", "cog")}
    r = requests.post(URL + "/ping", json=body, timeout=10).json()
    n += 1
    if r.get("flagged"):
        print("ALERT  mmsi=%s score=%.2f" % (r["mmsi"], r["score"]))
    time.sleep(1.0 / rate)
print("sent", n)
