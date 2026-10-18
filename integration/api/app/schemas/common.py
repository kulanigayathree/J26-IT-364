"""Shared types for every component.

Conventions (all components):
- Geometry is GeoJSON (RFC 7946): coordinates are [longitude, latitude] in WGS84 (EPSG:4326).
- Timestamps are ISO 8601 in UTC and are serialised with a trailing "Z".
- Spatial outputs are GeoJSON FeatureCollections.
"""

from datetime import datetime, timezone
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, PlainSerializer


def _to_utc_z(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


UtcDatetime = Annotated[
    AwareDatetime,
    PlainSerializer(_to_utc_z, return_type=str),
    Field(description="ISO 8601 timestamp in UTC, e.g. 2026-10-18T06:00:00Z"),
]

Severity = Literal["low", "medium", "high"]

Position = Annotated[
    tuple[float, float],
    Field(description="[longitude, latitude] in WGS84 degrees"),
]


class Point(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: Position


class LineString(BaseModel):
    type: Literal["LineString"] = "LineString"
    coordinates: list[Position]


class Polygon(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[Position]]


G = TypeVar("G", bound=BaseModel)
P = TypeVar("P", bound=BaseModel)
F = TypeVar("F", bound=BaseModel)


class Feature(BaseModel, Generic[G, P]):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Feature"] = "Feature"
    id: str | None = None
    geometry: G
    properties: P


class FeatureCollection(BaseModel, Generic[F]):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[F]


class EmptyProperties(BaseModel):
    pass


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str
    time: UtcDatetime
