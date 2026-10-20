"""C4 – Oil-Spill Detection and Vessel Attribution."""

from fastapi import APIRouter, Depends

from app.adapters import c4 as adapter
from app.auth import get_current_user
from app.schemas.c4 import C4Data, C4Summary

router = APIRouter(prefix="/api/c4", tags=["C4 Oil spill"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=C4Summary)
def summary() -> C4Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C4Data)
def data() -> C4Data:
    return adapter.get_data()
