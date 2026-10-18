"""C3 – Satellite-derived reef health. Mirrors frontend/src/features/c3-reef-health/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field

from .common import Feature, FeatureCollection, Point

ReefStatus = Literal["healthy", "watch", "degraded"]
YearMonth = Field(pattern=r"^\d{4}-\d{2}$", description="YYYY-MM")


class ReefProperties(BaseModel):
    id: str
    name: str
    region: str
    latest_month: str = YearMonth
    coral_cover_pct: float
    algae_cover_pct: float
    sand_rubble_pct: float
    change_12m_pct: float = Field(description="Change in coral cover over 12 months, percentage points")
    status: ReefStatus
    max_dhw_12m: float = Field(description="Highest degree heating weeks in the last 12 months")


class MonthlyCover(BaseModel):
    month: str = YearMonth
    coral_pct: float | None = Field(description="null when no cloud-free image that month")
    algae_pct: float | None
    sand_rubble_pct: float | None
    cloud_free_obs: int


class HeatStressMonth(BaseModel):
    month: str = YearMonth
    dhw: float = Field(description="Degree heating weeks (°C-weeks)")
    dhw_previous_year: float


class ReefCollection(FeatureCollection[Feature[Point, ReefProperties]]):
    """GET /api/c3/reefs"""


class ReefDetail(ReefProperties):
    """GET /api/c3/reefs/{reef_id}"""

    lon: float
    lat: float
    series: list[MonthlyCover]
    heat_stress: list[HeatStressMonth]
    method_note: str
