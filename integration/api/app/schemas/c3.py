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


# ---------------------------------------------------------------- live classification (POST /api/c3/classify)


class C3ModelInfo(BaseModel):
    name: str | None
    experiment: str | None
    features: list[str]
    classes: list[str]
    composite_version: str | None
    cv_macro_f1: float | None
    cv_accuracy: float | None
    trained_with: dict | None


class CompositeExample(BaseModel):
    id: str  # file name in data/external/c3/
    site: str
    version: str
    has_reef_mask: bool


class ClassifyStatus(BaseModel):
    available: bool
    message: str | None
    model: C3ModelInfo | None
    examples: list[CompositeExample]


class ClassCover(BaseModel):
    code: int
    name: str
    pixels: int
    area_ha: float
    percent: float


class ClassifyImages(BaseModel):
    rgb: str  # PNG data URLs
    classes: str


class ClassifyResult(BaseModel):
    image: str
    width: int
    height: int
    classified_pixels: int
    reef_mask_used: bool
    smoothed: bool
    cover: list[ClassCover]
    glint: dict
    images: ClassifyImages
    runtime_ms: int
