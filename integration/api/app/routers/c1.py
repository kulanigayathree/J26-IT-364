"""C1 – Vessel Behaviour Anomaly Detection."""

from fastapi import APIRouter, Depends

from app.adapters import c1 as adapter
from app.auth import get_current_user
from app.schemas.c1 import C1Data, C1Summary

router = APIRouter(prefix="/api/c1", tags=["C1 Vessel anomaly"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=C1Summary)
def summary() -> C1Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C1Data)
def data() -> C1Data:
    return adapter.get_data()
