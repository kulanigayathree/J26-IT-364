from pydantic import BaseModel

from app.schemas import ModelMeta, Severity


class Vessel(BaseModel):
    vessel_id: str
    name: str
    type: str
    lon: float
    lat: float
    time: str


class Anomaly(BaseModel):
    id: str
    vessel_id: str
    vessel_name: str
    anomaly_type: str
    score: float
    severity: Severity
    time: str
    lon: float
    lat: float
    description: str


class C1Summary(BaseModel):
    anomalies_today: int
    high_severity: int
    vessels_tracked: int
    total_anomalies: int


class C1Data(ModelMeta):
    summary: C1Summary
    vessels: list[Vessel]
    anomalies: list[Anomaly]


# ---------------------------------------------------------------- live analysis (POST /api/c1/analyse)


class ExampleTrack(BaseModel):
    id: str
    mmsi: str
    pings: int
    start: str
    end: str
    injected: list[str]  # anomaly types injected into this track during C1's evaluation


class ModelMetrics(BaseModel):
    model: str | None = None
    roc_auc: float | None = None
    pr_auc: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    far: float | None = None


class AnalyseStatus(BaseModel):
    available: bool
    message: str | None
    model: str | None
    threshold: float | None
    metrics: ModelMetrics | None
    examples: list[ExampleTrack]


class AnalyseSummary(BaseModel):
    pings: int
    vessels: int
    tracks: int
    windows: int
    flagged_windows: int
    events: int
    injected_windows: int
    injected_caught: int
    threshold: float
    gap_trigger_s: int
    runtime_ms: int


class AnomalyEvent(BaseModel):
    id: int
    type: str
    max_score: float
    start: str
    end: str
    lat: float
    lon: float
    windows: int
    injected: list[str]  # injected test anomaly types inside this event (empty = none)


class TrackPoint(BaseModel):
    t: str
    lat: float
    lon: float
    sog: float
    track: int
    injected: bool


class ScorePoint(BaseModel):
    t: str
    score: float
    flagged: bool
    injected: bool


class AnalyseResult(BaseModel):
    summary: AnalyseSummary
    events: list[AnomalyEvent]
    track: list[TrackPoint]
    timeline: list[ScorePoint]
