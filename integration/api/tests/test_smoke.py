"""Smoke tests: every endpoint answers and its mock data matches the schemas.

Run from integration/api:  pip install -r requirements-dev.txt && pytest
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["time"].endswith("Z")


@pytest.mark.parametrize(
    "path",
    [
        "/api/c1/tracks",
        "/api/c1/anomalies",
        "/api/c3/reefs",
        "/api/c4/spills",
    ],
)
def test_feature_collections(path):
    r = client.get(path)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) > 0
    lon, lat = _first_position(body["features"][0]["geometry"]["coordinates"])
    assert 70 < lon < 90 and 0 < lat < 15, "coordinates must be [lon, lat] around Sri Lanka"


@pytest.mark.parametrize("lead", [24, 48, 72])
def test_c2_forecast(lead):
    r = client.get("/api/c2/forecast", params={"lead_time_h": lead, "port_id": "galle"})
    assert r.status_code == 200
    body = r.json()
    assert body["lead_time_h"] == lead
    assert body["best_zone"]["port_id"] == "galle"
    assert body["issued_at"].endswith("Z")


def test_c2_ports_and_best_zone():
    ports = client.get("/api/c2/ports").json()
    assert ports
    r = client.get("/api/c2/best-zone", params={"port_id": ports[0]["id"]})
    assert r.status_code == 200
    assert client.get("/api/c2/best-zone", params={"port_id": "nowhere"}).status_code == 404
    assert client.get("/api/c2/forecast", params={"lead_time_h": 36}).status_code == 422


def test_c3_reef_detail():
    reef_id = client.get("/api/c3/reefs").json()["features"][0]["id"]
    r = client.get(f"/api/c3/reefs/{reef_id}")
    assert r.status_code == 200
    assert len(r.json()["series"]) > 0
    assert client.get("/api/c3/reefs/unknown").status_code == 404


def test_c4_spill_detail_and_dates():
    spills = client.get("/api/c4/spills").json()["features"]
    r = client.get(f"/api/c4/spills/{spills[0]['id']}")
    assert r.status_code == 200
    assert r.json()["candidates"][0]["rank"] == 1
    none = client.get("/api/c4/spills", params={"from": "2030-01-01"}).json()
    assert none["features"] == []


def test_cors_allows_vite_dev_server():
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def _first_position(coords):
    while isinstance(coords[0], list):
        coords = coords[0]
    return coords
