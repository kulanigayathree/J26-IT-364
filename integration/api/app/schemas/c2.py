from pydantic import BaseModel

from app.schemas import ModelMeta


class Port(BaseModel):
    name: str
    lon: float
    lat: float


class LeadInfo(BaseModel):
    lead: int
    date: str


class C2Summary(BaseModel):
    port: str
    best_probability: float
    best_lat: float
    best_lon: float
    distance_km: float  # return trip


class C2Data(ModelMeta):
    issued_date: str
    leads: list[LeadInfo]
    ports: list[Port]
    summary: C2Summary


class C2Forecast(ModelMeta):
    lead: int
    date: str
    lat: list[float]  # cell centres
    lon: list[float]
    cell_size: float
    probability: list[list[float | None]]  # [lat][lon], null = land
    uncertainty: list[list[float | None]]


class Zone(BaseModel):
    rank: int
    lat: float
    lon: float
    probability: float
    uncertainty: float
    distance_km: float  # return trip from the port
    fuel_litres: float
    fuel_cost_rs: float


class ReplayModel(BaseModel):
    key: str
    label: str
    has_uncertainty: bool
    uncertainty_note: str | None = None


class ReplayStatus(BaseModel):
    available: bool
    message: str | None
    models: list[ReplayModel]
    first_date: str | None  # first / last Day-1 date with a saved forecast
    last_date: str | None
    best_model: str | None


class DayMetrics(BaseModel):
    fishing_cells: int
    sea_cells: int
    roc_auc: float | None
    pr_auc: float | None
    top10_capture: float | None  # share of actual fishing cells inside the 10% highest-probability cells


class ReplayLead(BaseModel):
    lead: int
    date: str
    probability: list[list[float | None]]  # [lat][lon], null = land
    uncertainty: list[list[float | None]] | None
    actual: list[list[float | None]]  # 1 = fishing happened, 0 = no fishing, null = land
    metrics: DayMetrics


class ReplayResult(BaseModel):
    """GET /api/c2/replay: the C2 model's saved 2025 test forecast for one date, next to what really happened."""

    model: str
    model_label: str
    issued_after: str  # last input day
    lat: list[float]
    lon: list[float]
    cell_size: float
    leads: list[ReplayLead]
    runtime_ms: int


class C2Zones(ModelMeta):
    lead: int
    date: str
    port: Port
    fuel_l_per_km: float
    fuel_price: float
    zones: list[Zone]
