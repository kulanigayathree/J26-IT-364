"""C3 – Satellite-Derived Reef Health Monitoring."""

from fastapi import APIRouter, Depends

from app.adapters import c3 as adapter
from app.auth import get_current_user
from app.schemas.c3 import C3Data, C3Summary

router = APIRouter(prefix="/api/c3", tags=["C3 Reef health"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=C3Summary)
def summary() -> C3Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C3Data)
def data() -> C3Data:
    return adapter.get_data()
