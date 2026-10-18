"""Ocean AI – Marine Monitoring API.

Run from integration/api:  uvicorn app.main:app --reload
Docs:                      http://localhost:8000/docs
"""

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import c1, c2, c3, c4
from app.schemas.common import HealthResponse

VERSION = "0.1.0"

app = FastAPI(
    title="Ocean AI – Marine Monitoring API",
    version=VERSION,
    description=(
        "Shared API for the four components of J26-IT-364 (SLIIT). "
        "Geometry is GeoJSON with [lon, lat] WGS84 coordinates; timestamps are ISO 8601 UTC. "
        "All endpoints currently return sample data."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse(version=VERSION, time=datetime.now(timezone.utc))


app.include_router(c1.router)
app.include_router(c2.router)
app.include_router(c3.router)
app.include_router(c4.router)
