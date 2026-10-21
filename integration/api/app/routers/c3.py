"""C3 – Satellite-Derived Reef Health Monitoring."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.adapters import c3 as adapter
from app.auth import get_current_user
from app.inference import c3 as live
from app.schemas.c3 import C3Data, C3Summary, ClassifyResult, ClassifyStatus

router = APIRouter(prefix="/api/c3", tags=["C3 Reef health"], dependencies=[Depends(get_current_user)])

MAX_UPLOAD_MB = 100


@router.get("/summary", response_model=C3Summary)
def summary() -> C3Summary:
    return adapter.get_data().summary


@router.get("/data", response_model=C3Data)
def data() -> C3Data:
    return adapter.get_data()


@router.get("/classify/status", response_model=ClassifyStatus)
def classify_status() -> ClassifyStatus:
    """C3 model info and the Sentinel-2 composites available in data/external/c3/."""
    return live.status()


@router.post("/classify", response_model=ClassifyResult)
async def classify(
    file: UploadFile | None = File(None, description="Sentinel-2 GeoTIFF: B2,B3,B4,B8,B11 × 10000"),
    example_id: str | None = Form(None, description="A composite from data/external/c3/ instead of a file"),
    use_mask: bool = Form(True, description="Limit to the reef extent (ACA label file) when available"),
    smooth: bool = Form(True, description="3×3 majority filter, as in the C3 demo"),
) -> ClassifyResult:
    """Run the C3 benthic classifier on a Sentinel-2 composite and return the habitat map and cover %."""
    try:
        if file is not None and file.filename:
            data = await file.read()
            if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
                raise HTTPException(413, f"The file is larger than {MAX_UPLOAD_MB} MB.")
            return live.classify(upload=data, use_mask=use_mask, smooth=smooth)
        if example_id:
            return live.classify(example_id=example_id, use_mask=use_mask, smooth=smooth)
        raise HTTPException(400, "Upload a GeoTIFF or choose an example composite.")
    except live.C3Unavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
