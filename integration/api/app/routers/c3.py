"""C3 – Satellite-derived reef health monitoring (owner: Adikaram W.M.T.P)."""

from fastapi import APIRouter, HTTPException

from app.core.mock import load_mock
from app.schemas.c3 import ReefCollection, ReefDetail

router = APIRouter(prefix="/api/c3", tags=["C3 Reef health"])


@router.get("/reefs", response_model=ReefCollection, summary="Monitored reefs with latest cover")
def get_reefs() -> ReefCollection:
    # TODO(C3): replace with the latest monthly benthic-cover results from PostGIS.
    return ReefCollection.model_validate(load_mock("c3", "reefs.json"))


@router.get("/reefs/{reef_id}", response_model=ReefDetail, summary="Reef time series and heat stress")
def get_reef(reef_id: str) -> ReefDetail:
    # TODO(C3): replace with the time series query (models/C3_reef_health).
    reef = load_mock("c3", "reef_details.json").get(reef_id)
    if reef is None:
        raise HTTPException(status_code=404, detail=f'No reef with id "{reef_id}".')
    return ReefDetail.model_validate(reef)
