"""C2 – Catch-conditioned fishing-zone prediction. Mirrors frontend/src/features/c2-fishing-zone/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field

from .common import Feature, FeatureCollection, Polygon, UtcDatetime

LeadTime = Literal[24, 48, 72]
LEAD_TIMES: tuple[int, ...] = (24, 48, 72)
Confidence = Literal["high", "medium", "low"]


class Port(BaseModel):
    id: str
    name: str
    district: str
    lon: float
    lat: float


class ForecastCellProperties(BaseModel):
    cell_id: str
    probability: float = Field(ge=0, le=1, description="Probability of a good catch")
    uncertainty: float = Field(ge=0, le=1, description="Forecast spread; higher is less certain")


class ForecastCellCollection(FeatureCollection[Feature[Polygon, ForecastCellProperties]]):
    pass


class BestZone(BaseModel):
    port_id: str
    port_name: str
    lead_time_h: LeadTime
    lon: float
    lat: float
    probability: float = Field(ge=0, le=1)
    uncertainty: float = Field(ge=0, le=1)
    confidence: Confidence
    distance_km: float = Field(description="Straight-line distance from the port")
    bearing_deg: int
    direction: str = Field(description='8-point compass direction from the port, e.g. "SW"')
    fuel_litres: int = Field(description="Round-trip fuel estimate")
    fuel_rate_l_per_km: float
    valid_from: UtcDatetime
    valid_to: UtcDatetime


class ForecastGrid(BaseModel):
    issued_at: UtcDatetime
    lead_time_h: LeadTime
    valid_from: UtcDatetime
    valid_to: UtcDatetime
    cell_size_deg: float
    model_version: str
    cells: ForecastCellCollection


class Forecast(ForecastGrid):
    """GET /api/c2/forecast"""

    best_zone: BestZone
