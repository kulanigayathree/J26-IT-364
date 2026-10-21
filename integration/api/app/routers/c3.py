"""C3 – Satellite-Derived Reef Health Monitoring."""

from fastapi import APIRouter, Depends, HTTPException

from app.adapters import c3 as adapter
from app.auth import get_current_user
from app.inference import c3 as live
from app.schemas.c3 import C3Data, C3Summary, SiteHealth, SitesStatus

router = APIRouter(prefix="/api/c3", tags=["C3 Reef health"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=C3Summary)
def summary() -> C3Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C3Data)
def data() -> C3Data:
    return adapter.get_data()


@router.get("/sites", response_model=SitesStatus)
def sites() -> SitesStatus:
    """Reef sites with C3 results (saved or live) and thermal-stress data."""
    return live.sites_status()


@router.get("/sites/{site}", response_model=SiteHealth)
def site_health(site: str) -> SiteHealth:
    """Health of one reef: habitat map, benthic cover, agreement with ACA, thermal stress."""
    try:
        return live.site_health(site)
    except live.C3Unavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(404, str(e))
