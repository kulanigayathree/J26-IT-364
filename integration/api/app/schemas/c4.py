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


# ---------------------------------------------------------------- live detection (POST /api/c4/detect)


class ClassifierStatus(BaseModel):
    available: bool
    name: str | None
    threshold: float | None
    message: str | None


class DetectedPatch(BaseModel):
    id: int
    verdict: Literal["oil", "look-alike", "dark spot"]  # "dark spot" = not classified (no model file)
    probability: float | None  # probability of oil
    area_px: int
    elongation: float
    contrast: float
    bbox: list[int]  # [x0, y0, x1, y1] pixels
    outline: list[list[int]]  # [[x, y], ...] pixels


class DetectImages(BaseModel):
    original: str  # PNG data URLs
    filtered: str
    mask: str


class DetectResult(BaseModel):
    width: int
    height: int
    classifier: ClassifierStatus
    n_patches: int
    n_oil: int
    patches: list[DetectedPatch]
    images: DetectImages
    runtime_ms: int
