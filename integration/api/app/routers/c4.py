"""C4 – Oil-Spill Detection and Vessel Attribution."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.adapters import c4 as adapter
from app.auth import get_current_user
from app.inference import c4 as live
from app.schemas.c4 import C4Data, C4Summary, ClassifierStatus, DetectResult

router = APIRouter(prefix="/api/c4", tags=["C4 Oil spill"], dependencies=[Depends(get_current_user)])

MAX_UPLOAD_MB = 25


@router.get("/summary", response_model=C4Summary)
def summary() -> C4Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C4Data)
def data() -> C4Data:
    return adapter.get_data()


@router.get("/detect/status", response_model=ClassifierStatus)
def detect_status() -> ClassifierStatus:
    """Is the trained C4 classifier installed (data/external/c4/*.joblib)?"""
    return live.classifier_status()


@router.post("/detect", response_model=DetectResult)
async def detect(
    image: UploadFile = File(..., description="SAR image: PNG, JPG or GeoTIFF"),
    is_coast: bool = Form(False, description="Image includes coastline"),
) -> DetectResult:
    """Run the C4 model on an uploaded SAR image: dark spots -> oil vs look-alike."""
    data = await image.read()
    if not data:
        raise HTTPException(400, "The file is empty.")
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"The file is larger than {MAX_UPLOAD_MB} MB.")
    try:
        return live.detect(data, image.filename or "upload.png", is_coast)
    except live.C4Unavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
