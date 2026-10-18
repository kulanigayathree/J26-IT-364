"""C4 – Oil-spill detection and vessel attribution (owner: Jayasundara K.H.W.M.G.M)."""

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.core.mock import load_mock
from app.schemas.c4 import SpillCollection, SpillDetail

router = APIRouter(prefix="/api/c4", tags=["C4 Oil spill"])


@router.get("/spills", response_model=SpillCollection, summary="Detected oil slicks")
def get_spills(
    date_from: date | None = Query(None, alias="from", description="First day (UTC), inclusive"),
    date_to: date | None = Query(None, alias="to", description="Last day (UTC), inclusive"),
) -> SpillCollection:
    # TODO(C4): replace with the SAR slick detections stored in PostGIS (models/C4_oil_spill).
    data = SpillCollection.model_validate(load_mock("c4", "spills.json"))
    data.features = [
        f
        for f in data.features
        if (date_from is None or f.properties.detected_at.date() >= date_from)
        and (date_to is None or f.properties.detected_at.date() <= date_to)
    ]
    return data


@router.get("/spills/{spill_id}", response_model=SpillDetail, summary="Slick with ranked candidate vessels")
def get_spill(spill_id: str) -> SpillDetail:
    # TODO(C4): replace with the attribution model output. Candidates are candidates, not proof.
    detail = load_mock("c4", "spill_details.json").get(spill_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f'No spill with id "{spill_id}".')
    return SpillDetail.model_validate(detail)
