"""C1 – Vessel behaviour anomaly detection (owner: Pathirana K.G.T.K.S)."""

from fastapi import APIRouter, Query

from app.core.mock import load_mock
from app.schemas.c1 import AnomalyCollection, AnomalyType, VesselTrackCollection
from app.schemas.common import UtcDatetime

router = APIRouter(prefix="/api/c1", tags=["C1 Vessel anomaly"])


@router.get("/tracks", response_model=VesselTrackCollection, summary="Recent AIS vessel tracks")
def get_tracks() -> VesselTrackCollection:
    # TODO(C1): replace with the PostGIS query for recent AIS tracks (models/C1_vessel_anomaly).
    return VesselTrackCollection.model_validate(load_mock("c1", "tracks.json"))


@router.get("/anomalies", response_model=AnomalyCollection, summary="Scored vessel anomalies")
def get_anomalies(
    since: UtcDatetime | None = Query(None, description="Only anomalies detected after this time"),
    min_score: float = Query(0.0, ge=0, le=1),
    anomaly_type: AnomalyType | None = None,
) -> AnomalyCollection:
    # TODO(C1): replace with the anomaly model output stored in PostGIS.
    data = AnomalyCollection.model_validate(load_mock("c1", "anomalies.json"))
    data.features = [
        f
        for f in data.features
        if f.properties.score >= min_score
        and (since is None or f.properties.detected_at >= since)
        and (anomaly_type is None or f.properties.anomaly_type == anomaly_type)
    ]
    return data
