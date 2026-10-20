from typing import Literal

from pydantic import BaseModel

from app.schemas import ModelMeta, Severity


class Candidate(BaseModel):
    """A candidate source vessel. Candidate, not proof."""

    rank: int
    vessel_id: str
    vessel_name: str
    score: float
    evidence: list[str]


class Spill(BaseModel):
    id: str
    location_name: str
    lon: float
    lat: float
    detected_at: str
    sensor: str
    area_km2: float
    confidence: float
    severity: Severity
    status: Literal["active", "resolved"]
    polygon: list[list[float]]  # ring of [lon, lat]
    candidates: list[Candidate]


class C4Summary(BaseModel):
    active: int
    total: int
    high_severity: int
    candidate_vessels: int


class C4Data(ModelMeta):
    summary: C4Summary
    spills: list[Spill]
