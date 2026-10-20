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
