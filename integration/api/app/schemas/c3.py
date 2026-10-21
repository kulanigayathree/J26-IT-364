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


# ---------------------------------------------------------------- reef health by location (GET /api/c3/sites)


class C3ModelInfo(BaseModel):
    name: str | None
    experiment: str | None
    features: list[str]
    classes: list[str]
    composite_version: str | None
    cv_macro_f1: float | None
    cv_accuracy: float | None
    trained_with: dict | None


class ReefSite(BaseModel):
    code: str  # e.g. HKD, PGI (as in the C3 file names)
    name: str
    region: str
    lat: float | None
    lon: float | None
    live: bool  # a Sentinel-2 composite is available -> the model runs live
    saved: bool  # saved C3 results exist
    thermal: bool  # NOAA DHW file exists


class SitesStatus(BaseModel):
    available: bool
    message: str | None
    model: C3ModelInfo | None
    sites: list[ReefSite]


class ClassCover(BaseModel):
    code: int
    name: str
    pixels: int
    area_ha: float
    percent: float


class DhwMonth(BaseModel):
    month: str  # YYYY-MM
    dhw: float  # monthly maximum


class ThermalStress(BaseModel):
    latest: float
    latest_date: str
    max_12m: float
    max_12m_date: str
    max_all: float
    max_all_date: str
    alert: str  # NOAA Coral Reef Watch: No alert / Alert 1 / Alert 2
    alert_text: str
    severity: Literal["low", "medium", "high"]
    monthly: list[DhwMonth]


class HealthImages(BaseModel):
    rgb: str | None  # live run: true colour PNG
    classes: str | None  # live run: habitat map PNG
    figure: str | None  # saved run: C3 figure (image | prediction | reference)


class SiteHealth(BaseModel):
    code: str
    name: str
    region: str
    lat: float | None
    lon: float | None
    source: Literal["live", "saved"]
    source_note: str
    cover: list[ClassCover]
    coral_algae_percent: float | None
    mapped_area_ha: float
    agreement: float | None  # agreement with the Allen Coral Atlas reference map
    thermal: ThermalStress | None
    images: HealthImages
    runtime_ms: int
