"""C1 – Vessel Behaviour Anomaly Detection."""

from fastapi import APIRouter, Depends, Form, HTTPException

from app.adapters import c1 as adapter
from app.auth import get_current_user
from app.inference import c1 as live
from app.schemas.c1 import AnalyseResult, AnalyseStatus, C1Data, C1Summary

router = APIRouter(prefix="/api/c1", tags=["C1 Vessel anomaly"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=C1Summary)
def summary() -> C1Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C1Data)
def data() -> C1Data:
    return adapter.get_data()


@router.get("/analyse/status", response_model=AnalyseStatus)
def analyse_status() -> AnalyseStatus:
    """Is the trained C1 model installed? Also lists example tracks."""
    return live.status()


@router.post("/analyse", response_model=AnalyseResult)
async def analyse(
    example_id: str = Form(..., description="A recorded track from the C1 evaluation data"),
    inject: str | None = Form(None, description="Optionally inject a test anomaly: spoof, gap, slowdown, zigzag"),
) -> AnalyseResult:
    """Run the C1 model on a recorded track (like C1's DEMO mode), optionally with an injected test anomaly."""
    try:
        return live.analyse(live.example_track(example_id), inject or None)
    except live.C1Unavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
