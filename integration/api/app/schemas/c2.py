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


class C2Zones(ModelMeta):
    lead: int
    date: str
    port: Port
    fuel_l_per_km: float
    fuel_price: float
    zones: list[Zone]
