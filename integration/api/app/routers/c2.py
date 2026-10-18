"""C2 – Catch-conditioned fishing-zone prediction (owner: Gayathree M.G.K)."""

from fastapi import APIRouter, HTTPException, Query

from app.core.mock import load_mock
from app.schemas.c2 import LEAD_TIMES, BestZone, Forecast, ForecastGrid, Port

router = APIRouter(prefix="/api/c2", tags=["C2 Fishing zone"])

DEFAULT_PORT = "negombo"
LEAD_TIME_HELP = "Forecast lead time in hours: 24, 48 or 72"


def _check_lead_time(lead_time_h: int) -> int:
    if lead_time_h not in LEAD_TIMES:
        raise HTTPException(status_code=422, detail=f"lead_time_h must be one of {LEAD_TIMES}.")
    return lead_time_h


def _best_zone(port_id: str, lead_time_h: int) -> BestZone:
    # TODO(C2): replace with the fuel-aware ranking of the forecast grid for this port.
    for zone in load_mock("c2", "best_zones.json"):
        if zone["port_id"] == port_id and zone["lead_time_h"] == lead_time_h:
            return BestZone.model_validate(zone)
    raise HTTPException(status_code=404, detail=f'No forecast for port "{port_id}".')


@router.get("/ports", response_model=list[Port], summary="Fishing harbours")
def get_ports() -> list[Port]:
    # TODO(C2): load harbours from PostGIS.
    return [Port.model_validate(p) for p in load_mock("c2", "ports.json")]


@router.get("/forecast", response_model=Forecast, summary="Probability grid and best zone")
def get_forecast(
    lead_time_h: int = Query(24, description=LEAD_TIME_HELP),
    port_id: str = Query(DEFAULT_PORT, description="Harbour used for the best zone"),
) -> Forecast:
    _check_lead_time(lead_time_h)
    # TODO(C2): replace with the latest model run (models/C2_fishing_zone) stored in PostGIS.
    grid = ForecastGrid.model_validate(load_mock("c2", f"forecast_{lead_time_h}.json"))
    return Forecast(**grid.model_dump(), best_zone=_best_zone(port_id, lead_time_h))


@router.get("/best-zone", response_model=BestZone, summary="Best zone for one harbour (fisher view)")
def get_best_zone(
    port_id: str = Query(DEFAULT_PORT),
    lead_time_h: int = Query(24, description=LEAD_TIME_HELP),
) -> BestZone:
    return _best_zone(port_id, _check_lead_time(lead_time_h))
