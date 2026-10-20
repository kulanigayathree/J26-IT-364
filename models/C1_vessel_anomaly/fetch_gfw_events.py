"""
Fetch REAL Global Fishing Watch events inside Sri Lanka's EEZ (region id 8346).
- Token is read from the GFW_API_TOKEN environment variable (never hard-code it).
- If anything fails, the script STOPS with an error. There is NO synthetic fallback.
- Dataset IDs and the request/response format follow GFW's docs (checked 2026-10-19).
  If you get a 4xx error, copy the message back to Claude.

Usage:
    set GFW_API_TOKEN=your_new_token          (Windows cmd)
    python fetch_gfw_events.py --start 2024-01-01 --end 2024-06-30
    python fetch_gfw_events.py --test          # 1-request connectivity test
"""
import argparse
import os
import sys
import time
from datetime import date, timedelta

import pandas as pd
import requests

BASE = "https://gateway.api.globalfishingwatch.org/v3/events"

DATASETS = {
    "fishing": "public-global-fishing-events:latest",
    "gap": "public-global-gaps-events:latest",
    "loitering": "public-global-loitering-events:latest",
    "encounter": "public-global-encounters-events:latest",
}

# Sri Lanka's EEZ in GFW's region catalogue (id = Marine Regions MRGID 8346), as in GFW's own docs example.
REGION = {"dataset": "public-eez-areas", "id": 8346}


def get_token():
    token = os.environ.get("GFW_API_TOKEN")
    if not token:
        sys.exit("ERROR: set the GFW_API_TOKEN environment variable first.")
    return token


def fetch_window(session, dataset, start, end, page_size=500):
    rows, offset = [], 0
    while True:
        body = {
            "datasets": [dataset],
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "region": REGION,
        }
        resp = session.post(
            BASE, params={"limit": page_size, "offset": offset}, json=body, timeout=60
        )
        if resp.status_code not in (200, 201):   # GFW answers 201 on success
            sys.exit(f"ERROR {resp.status_code} for {dataset}: {resp.text[:500]}")
        data = resp.json()
        entries = data.get("entries", [])
        rows.extend(entries)
        nxt = data.get("nextOffset")
        if not entries or nxt is None:
            break
        offset = nxt
        time.sleep(0.3)
    return rows


def flatten(e, event_type):
    pos = e.get("position") or {}
    v = e.get("vessel") or {}
    return {
        "event_id": e.get("id"),
        "event_type": event_type,
        "start_time": e.get("start"),
        "end_time": e.get("end"),
        "lat": pos.get("lat"),
        "lon": pos.get("lon"),
        "vessel_id": v.get("id"),
        "mmsi": v.get("ssvid"),
        "vessel_name": v.get("name"),
        "flag": v.get("flag"),
        "vessel_type": v.get("type"),
        "is_synthetic": False,
    }


def month_windows(start, end):
    cur = start
    while cur <= end:
        nxt = min((cur.replace(day=28) + timedelta(days=4)).replace(day=1), end + timedelta(days=1))
        yield cur, nxt - timedelta(days=1)
        cur = nxt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2024-01-01")
    ap.add_argument("--end", default="2024-03-31")
    ap.add_argument("--out", default="data/raw/gfw_sri_lanka_events_REAL.csv")
    ap.add_argument("--test", action="store_true", help="single small request to test connectivity")
    args = ap.parse_args()

    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {get_token()}"})

    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    if args.test:
        end = min(end, start + timedelta(days=6))
        r = fetch_window(session, DATASETS["fishing"], start, end, page_size=5)
        print(f"Connectivity OK. Got {len(r)} fishing events in test window.")
        return

    all_rows = []
    for etype, ds in DATASETS.items():
        for s, e in month_windows(start, end):
            entries = fetch_window(session, ds, s, e)
            print(f"{etype:10s} {s} -> {e}: {len(entries)} events")
            all_rows.extend(flatten(x, etype) for x in entries)

    if not all_rows:
        sys.exit("No events returned. Check dates / dataset IDs. NOT generating fake data.")

    df = pd.DataFrame(all_rows).drop_duplicates(subset="event_id")
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    df.to_csv(args.out, index=False)
    print(f"Saved {len(df)} REAL events -> {args.out}")


if __name__ == "__main__":
    main()