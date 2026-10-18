"""C4 – Oil-spill detection and vessel attribution. Mirrors frontend/src/features/c4-oil-spill/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field

from .common import Feature, FeatureCollection, LineString, Polygon, Severity, UtcDatetime

SpillStatus = Literal["new", "under_review", "confirmed", "dismissed"]
EvidenceKind = Literal["track_overlap", "proximity", "heading_alignment", "ais_gap", "speed_drop"]


class SpillProperties(BaseModel):
    id: str
    detected_at: UtcDatetime = Field(description="SAR acquisition time")
    sensor: str
    location_name: str
    area_km2: float
    confidence: float = Field(ge=0, le=1, description="Detector confidence")
    severity: Severity
    status: SpillStatus
    candidate_count: int


class Evidence(BaseModel):
    kind: EvidenceKind
    label: str
    value: str


class CandidateVessel(BaseModel):
    rank: int = Field(ge=1, description="1 = most likely candidate")
    mmsi: str
    vessel_name: str
    vessel_type: str
    flag: str
    score: float = Field(ge=0, le=1, description="Ranking aid, not a probability of guilt")
    evidence: list[Evidence]


class CandidateTrackProperties(BaseModel):
    mmsi: str
    vessel_name: str
    rank: int


SpillFeature = Feature[Polygon, SpillProperties]


class SpillCollection(FeatureCollection[SpillFeature]):
    """GET /api/c4/spills"""


class CandidateTrackCollection(FeatureCollection[Feature[LineString, CandidateTrackProperties]]):
    pass


class SpillDetail(BaseModel):
    """GET /api/c4/spills/{spill_id}. Candidates are candidates, not proof."""

    spill: SpillFeature
    candidates: list[CandidateVessel]
    candidate_tracks: CandidateTrackCollection
    attribution_method: str
