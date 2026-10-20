from typing import Literal

from pydantic import BaseModel

from app.schemas import ModelMeta

ReefStatus = Literal["good", "watch", "at_risk"]


class MonthlyCover(BaseModel):
    month: str  # YYYY-MM
    cover: dict[str, float]  # class name -> percent, e.g. {"Coral": 31.2, "Algae": 28.4, "Other": 40.4}


class Reef(BaseModel):
    id: str
    name: str
    region: str
    lon: float
    lat: float
    status: ReefStatus
    change_12m: float  # change in coral cover over 12 months, percentage points
    latest_month: str
    latest_cover: dict[str, float]
    monthly: list[MonthlyCover]


class C3Summary(BaseModel):
    reefs_total: int
    at_risk: int
    watch: int
    mean_coral: float | None


class C3Data(ModelMeta):
    classes: list[str]
    summary: C3Summary
    reefs: list[Reef]
