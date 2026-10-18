"""C1 – Vessel behaviour anomaly detection. Mirrors frontend/src/features/c1-vessel-anomaly/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field

from .common import Feature, FeatureCollection, LineString, Point, Severity, UtcDatetime

AnomalyType = Literal["ais_gap", "loitering", "speed_change", "route_deviation", "dark_vessel"]
DetectionSource = Literal["AIS", "SAR", "AIS+SAR"]


class VesselTrackProperties(BaseModel):
    mmsi: str
    vessel_name: str
    vessel_type: str
    flag: str = Field(description="ISO 3166-1 alpha-2 flag state")
    start_time: UtcDatetime
    end_time: UtcDatetime
    point_count: int


class AnomalyProperties(BaseModel):
    id: str
    mmsi: str = Field(description='"unknown" for SAR-only detections')
    vessel_name: str
    anomaly_type: AnomalyType
    score: float = Field(ge=0, le=1, description="0–1, higher is more unusual")
    severity: Severity
    detected_at: UtcDatetime
    source: DetectionSource
    description: str


class VesselTrackCollection(FeatureCollection[Feature[LineString, VesselTrackProperties]]):
    """GET /api/c1/tracks"""


class AnomalyCollection(FeatureCollection[Feature[Point, AnomalyProperties]]):
    """GET /api/c1/anomalies"""
