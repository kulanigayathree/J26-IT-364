"""C2 – Fishing-Zone Prediction with Uncertainty."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.adapters import c2 as adapter
from app.auth import get_current_user
from app.inference import c2 as live
from app.schemas.c2 import C2Data, C2Forecast, C2Summary, C2Zones, ReplayResult, ReplayStatus

router = APIRouter(prefix="/api/c2", tags=["C2 Fishing zone"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=C2Summary)
def summary() -> C2Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C2Data)
def data() -> C2Data:
    return adapter.get_data()


@router.get("/forecast", response_model=C2Forecast)
def forecast(lead: int = Query(1, ge=1, le=3, description="Day 1, 2 or 3")) -> C2Forecast:
    try:
        return adapter.get_forecast(lead)
    except KeyError as e:
        raise HTTPException(404, str(e.args[0]))


@router.get("/zones", response_model=C2Zones)
def zones(
    lead: int = Query(1, ge=1, le=3),
    port: str = Query(adapter.DEFAULT_PORT),
    fuel_l_per_km: float = Query(adapter.DEFAULT_FUEL_L_PER_KM, gt=0, le=50),
    fuel_price: float = Query(adapter.DEFAULT_FUEL_PRICE, ge=0, le=10000, description="Rs per litre"),
    max_km: float | None = Query(None, gt=0, description="Optional limit on return-trip distance"),
) -> C2Zones:
    p = adapter.find_port(port)
    if p is None:
        raise HTTPException(404, f'Unknown port "{port}".')
    try:
        return adapter.get_zones(lead, p, fuel_l_per_km, fuel_price, max_km)
    except KeyError as e:
        raise HTTPException(404, str(e.args[0]))


@router.get("/replay/status", response_model=ReplayStatus)
def replay_status() -> ReplayStatus:
    """Which saved C2 test forecasts are available (data/external/c2/), and for which dates."""
    return live.status()


@router.get("/replay", response_model=ReplayResult)
def replay(
    date: str = Query(..., description="Day 1 of the forecast, e.g. 2025-06-14 (2025 test period)"),
    model: str = Query("ensemble", description="ensemble, convlstm, convgru or unet"),
) -> ReplayResult:
    """The C2 model's saved 3-day forecast for this date, next to the actual fishing that happened."""
    try:
        return live.replay(date, model)
    except live.C2Unavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
