"""C1 – Vessel Behaviour Anomaly Detection."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.adapters import c1 as adapter
from app.auth import get_current_user
from app.inference import c1 as live
from app.schemas.c1 import AnalyseResult, AnalyseStatus, C1Data, C1Summary

router = APIRouter(prefix="/api/c1", tags=["C1 Vessel anomaly"], dependencies=[Depends(get_current_user)])

MAX_UPLOAD_MB = 20


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
    file: UploadFile | None = File(None, description="AIS CSV: time, lat, lon, sog, cog (mmsi optional)"),
    example_id: str | None = Form(None, description="Use an example track instead of a file"),
    inject: str | None = Form(None, description="Optionally inject a test anomaly: spoof, gap, slowdown, zigzag"),
) -> AnalyseResult:
    """Run the C1 model on a vessel track and return the anomalies it finds."""
    try:
        if file is not None and file.filename:
            data = await file.read()
            if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
                raise HTTPException(413, f"The file is larger than {MAX_UPLOAD_MB} MB.")
            df = live.read_upload(data)
        elif example_id:
            df = live.example_track(example_id)
        else:
            raise HTTPException(400, "Upload a CSV file or choose an example track.")
        return live.analyse(df, inject or None)
    except live.C1Unavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
