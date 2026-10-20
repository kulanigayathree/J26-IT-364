"""C1 scoring backend (FastAPI). Any AIS source - a receiver, a satellite-AIS feed, a script - POSTs pings here;
the dashboard reads the results from GET /state. Nobody has to press a button.

Run (from models\\C1_vessel_anomaly):   python -m uvicorn api_server:app --port 8000
Docs page (auto-generated):          http://localhost:8000/docs

    POST /ping       {"mmsi":..,"time":"2025-01-01T00:00:00Z","lat":..,"lon":..,"sog":..,"cog":..}  -> score
                     (true_anom / true_type are optional: only the labelled DEMO feeder sends them, so the
                      dashboard can check itself. A real receiver does not send them.)
    GET  /state      everything the dashboard shows (counters, vessels, confirmed anomalous vessels, trails)
    GET  /alerts     GeoJSON (RFC 7946): confirmed anomalous vessels + blackout search areas + dead-reckoned points
    GET  /stats      counters
    POST /reset      start the counters from zero
    POST /threshold  {"value": 0.65}
"""
import os
from collections import deque
from pathlib import Path

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

from stream_engine import StreamEngine

HERE = Path(__file__).resolve().parent


def pick_results():
    env = os.environ.get("C1_RESULTS")
    if env:
        return Path(env)
    for n in ("results_colab", "results_c1_v2", "results_c1"):
        if (HERE / n / "model.pt").exists():
            return HERE / n
    return HERE / "results_c1"


RES = pick_results()
CSV = os.environ.get("C1_TRAIN_CSV", str(HERE.parent.parent / "data" / "raw" / "trawlers_small.csv"))
engine = StreamEngine(RES, csv_path=CSV)
TRAILS = {}                                  # mmsi -> last positions [lon, lat] (for the dashboard's movement lines)
app = FastAPI(title="C1 Vessel Anomaly Scoring API")


class Ping(BaseModel):
    mmsi: int
    time: str
    lat: float
    lon: float
    sog: float
    cog: float
    true_anom: int = 0                       # demo only
    true_type: str = ""                      # demo only


class Threshold(BaseModel):
    value: float


def _plain(x):
    """Make numpy / pandas values JSON friendly."""
    if isinstance(x, dict):
        return {str(k): _plain(v) for k, v in x.items()}
    if isinstance(x, (list, tuple, deque)):
        return [_plain(v) for v in x]
    if isinstance(x, np.generic):
        return x.item()
    if isinstance(x, float) and (x != x):
        return None
    if hasattr(x, "isoformat"):
        return x.isoformat()
    return x


@app.post("/ping")
def ping(p: Ping):
    r = engine.process(p.dict())
    if r.get("status") in ("scored", "warming_up"):
        t = TRAILS.setdefault(int(r["mmsi"]), [])
        t.append([round(r["lon"], 4), round(r["lat"], 4)])
        if len(t) > 60:
            del t[0]
    return {k: r.get(k) for k in ("status", "mmsi", "score", "flagged")}


@app.get("/state")
def state(n: int = 150):
    s = engine.snapshot(n_alerts=n)
    s = _plain(s)
    s["trails"] = {str(m): v for m, v in TRAILS.items()}
    s["model_folder"] = RES.name
    return s


@app.post("/reset")
def reset():
    engine.reset()
    TRAILS.clear()
    return {"ok": True}


@app.post("/threshold")
def threshold(t: Threshold):
    engine.set_threshold(t.value)
    return {"threshold": engine.threshold}


@app.get("/alerts")
def alerts(limit: int = 50):
    return engine.alerts_geojson(limit)


@app.get("/stats")
def stats():
    s = engine.snapshot(0)
    return {k: s[k] for k in ("n_pings", "n_scored", "n_alerts", "n_rejected", "n_vessels", "mean_latency_ms", "threshold")}