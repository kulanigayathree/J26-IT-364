"""C3 live classification: runs the trained C3 benthic classifier on a Sentinel-2 composite.

Pre-processing and prediction are copied EXACTLY from the C3 member's demo
models/C3_reef_health/app.py (read_tif … predict, reef_mask_for). That file is a Streamlit script,
so it cannot be imported; keep these functions in sync with it if C3 changes the pipeline.

Model:  models/C3_reef_health/best_model.joblib (bundle with model, label encoder, feature list).
Images: data/external/c3/S2_<SITE>_composite[_v2].tif  (B2,B3,B4,B8,B11 × 10000), optional reef
        masks ACA_<SITE>_label[_v2].tif. Users can also upload their own GeoTIFF.
"""

import base64
import os
import re
import tempfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
MODEL_FILE = Path(os.environ.get("C3_MODEL_FILE", REPO / "models" / "C3_reef_health" / "best_model.joblib"))
DATA_DIR = Path(os.environ.get("C3_DATA_DIR", REPO / "data" / "external" / "c3"))

CLASSES = {11: "Sand", 12: "Rubble", 13: "Rock", 14: "Seagrass", 15: "Coral/Algae", 18: "Microalgal Mats"}
# Map colours from the website theme (src/theme.ts), so the map matches the rest of the app.
CLASS_RGB = {11: (196, 122, 28), 12: (200, 205, 211), 13: (91, 100, 112), 14: (47, 125, 107),
             15: (217, 101, 59), 18: (27, 94, 140)}
PIXEL_HA = 0.01  # Sentinel-2 10 m pixel = 100 m² = 0.01 ha
MAX_SIDE = 3000


class C3Unavailable(RuntimeError):
    pass


def _libs():
    try:
        import joblib
        import numpy as np
        import rasterio
        from scipy.ndimage import uniform_filter
    except ImportError as e:
        raise C3Unavailable(f"C3 classification needs extra packages ({e.name}). Run: pip install -r requirements.txt") from e
    return joblib, np, rasterio, uniform_filter


# ---------------- preprocessing: copied from models/C3_reef_health/app.py ----------------


def read_tif(src):
    _, np, _, _ = _libs()
    arr = src.read().astype("float32")
    arr[arr <= 0] = np.nan  # nodata (-9999) and invalid pixels
    return arr / 10000.0  # back to reflectance


def estimate_glint(arr, dark_pct=10):
    """Hedley-type sunglint parameters from the image's optically-deep (darkest) water."""
    _, np, _, _ = _libs()
    b2, b3, b4, b8 = arr[0], arr[1], arr[2], arr[3]
    valid = np.isfinite(b2) & np.isfinite(b3) & np.isfinite(b4) & np.isfinite(b8)
    dark = b3 - b8
    deep = valid & (dark <= np.nanpercentile(dark[valid], dark_pct))
    nir = b8[deep]
    g = {"min_nir": float(np.percentile(nir, 1)), "n_deep": int(deep.sum())}
    for name, b in zip(["B2", "B3", "B4"], [b2, b3, b4]):
        g[name] = float(np.clip(np.polyfit(nir, b[deep], 1)[0], 0, 2))
    return g


def nanmean_filter(x, size):
    _, np, _, uniform_filter = _libs()
    valid = np.isfinite(x)
    num = uniform_filter(np.where(valid, x, 0.0).astype("float64"), size=size, mode="nearest")
    den = uniform_filter(valid.astype("float64"), size=size, mode="nearest")
    with np.errstate(invalid="ignore", divide="ignore"):
        m = num / den
    m[den < 0.5] = np.nan
    return m.astype("float32")


def nanstd_filter(x, size):
    _, np, _, _ = _libs()
    m, m2 = nanmean_filter(x, size), nanmean_filter(x * x, size)
    return np.sqrt(np.clip(m2 - m * m, 0, None))


def feature_spec(bundle):
    return bundle.get("feature_spec", {"glint_dark_pct": bundle.get("glint_dark_pct", 10), "neigh_sizes": []})


def make_features(arr, bundle):
    _, np, _, _ = _libs()
    spec = feature_spec(bundle)
    g = estimate_glint(arr, spec.get("glint_dark_pct", 10))
    f = {}
    for i, b in enumerate(["B2", "B3", "B4"]):
        f[b] = arr[i]
        f[b + "g"] = np.clip(arr[i] - g[b] * (arr[3] - g["min_nir"]), 1e-4, None)
    f["r23"] = np.log(f["B2g"]) - np.log(f["B3g"])
    f["r24"] = np.log(f["B2g"]) - np.log(f["B4g"])
    sizes = spec.get("neigh_sizes", [])
    for b in ["B2g", "B3g", "B4g"]:
        for k in sizes:
            f[f"{b}_m{k}"] = nanmean_filter(f[b], k)
        if sizes:
            f[f"{b}_s{max(sizes)}"] = nanstd_filter(f[b], max(sizes))
    return np.stack([f[k] for k in bundle["features"]], axis=-1), g


def majority_filter(pred, valid, codes, size=3):
    _, np, _, uniform_filter = _libs()
    counts = np.stack([uniform_filter(((pred == c) & valid).astype("float32"), size, mode="nearest") for c in codes])
    return np.where(valid, np.asarray(codes)[counts.argmax(0)], 0).astype(pred.dtype)


def predict(arr, bundle, mask=None, smooth=False):
    _, np, _, _ = _libs()
    feat, g = make_features(arr, bundle)
    valid = np.isfinite(feat).all(axis=-1)
    if mask is not None:
        valid &= mask
    pred = np.zeros(valid.shape, dtype=np.int16)
    if valid.any():
        y = bundle["model"].predict(feat[valid])
        pred[valid] = bundle["le"].inverse_transform(np.asarray(y).astype(int))
        if smooth:
            pred = majority_filter(pred, valid, list(bundle["le"].classes_), bundle.get("smooth_size", 3))
    return pred, valid, g


def reef_mask_for(name, shape):
    """ACA_<SITE>_label[_v2].tif (band 1) as reef-extent mask when it matches the image."""
    _, _, rasterio, _ = _libs()
    m = re.match(r"S2_([A-Za-z0-9]+)_composite", name)
    if not m:
        return None
    for fn in [f"ACA_{m.group(1)}_label_v2.tif", f"ACA_{m.group(1)}_label.tif"]:
        path = DATA_DIR / fn
        if path.exists():
            with rasterio.open(path) as src:
                aca = src.read(1)
            if aca.shape == shape:
                return aca > 0
    return None


# ---------------- API helpers ----------------

_cache: dict = {}


def load_bundle() -> dict:
    if not MODEL_FILE.exists():
        raise C3Unavailable(f"C3 model not found at {MODEL_FILE}.")
    key = MODEL_FILE.stat().st_mtime
    if _cache.get("key") != key:
        joblib, *_ = _libs()
        try:
            _cache.update(key=key, bundle=joblib.load(MODEL_FILE))
        except ModuleNotFoundError as e:
            raise C3Unavailable(f"The C3 model needs the package '{e.name}'. Run: pip install -r requirements.txt") from e
    return _cache["bundle"]


def list_examples() -> list[dict]:
    if not DATA_DIR.exists():
        return []
    out = []
    for p in sorted(DATA_DIR.glob("S2_*_composite*.tif")):
        m = re.match(r"S2_([A-Za-z0-9]+)_composite(_v\d)?", p.name)
        site = m.group(1) if m else p.stem
        out.append({"id": p.name, "site": site, "version": (m.group(2) or "_v1")[1:] if m else "",
                    "has_reef_mask": any(DATA_DIR.glob(f"ACA_{site}_label*.tif"))})
    return out


def status() -> dict:
    try:
        b = load_bundle()
    except C3Unavailable as e:
        return {"available": False, "message": str(e), "model": None, "examples": []}
    model = {
        "name": b.get("name"),
        "experiment": b.get("experiment", b.get("feature_set")),
        "features": list(b.get("features", [])),
        "classes": [CLASSES.get(int(c), str(c)) for c in b["le"].classes_],
        "composite_version": b.get("composite_version"),
        "cv_macro_f1": b.get("cv_macro_f1"),
        "cv_accuracy": b.get("cv_accuracy"),
        "trained_with": b.get("versions"),
    }
    examples = list_examples()
    msg = None if examples else "No Sentinel-2 composites in data/external/c3/ yet. You can still upload a GeoTIFF."
    return {"available": True, "message": msg, "model": model, "examples": examples}


def _png(np, rgb) -> str:
    import cv2

    ok, buf = cv2.imencode(".png", cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()


def classify(*, upload: bytes | None = None, example_id: str | None = None, use_mask: bool = True,
             smooth: bool = True) -> dict:
    _, np, rasterio, _ = _libs()
    bundle = load_bundle()
    tmp = None
    try:
        if upload is not None:
            fd, tmp = tempfile.mkstemp(suffix=".tif")
            with os.fdopen(fd, "wb") as f:
                f.write(upload)
            path, name = Path(tmp), "upload.tif"
        else:
            path = DATA_DIR / (example_id or "")
            if not example_id or path.parent != DATA_DIR or not path.exists():
                raise ValueError("Unknown example image.")
            name = path.name
        try:
            with rasterio.open(path) as src:
                if src.count < 4:
                    raise ValueError(f"The image has {src.count} band(s); C3 needs B2, B3, B4, B8 (and B11) in that order.")
                if max(src.height, src.width) > MAX_SIDE:
                    raise ValueError(f"Image is {src.width}×{src.height} px; please use up to {MAX_SIDE} px.")
                arr = read_tif(src)
        except rasterio.errors.RasterioIOError as e:
            raise ValueError("Could not read this file. Upload a Sentinel-2 GeoTIFF (B2,B3,B4,B8,B11 × 10000).") from e
    finally:
        if tmp:
            os.remove(tmp)

    t0 = time.perf_counter()
    mask = reef_mask_for(name, arr.shape[1:]) if use_mask else None
    try:
        pred, valid, g = predict(arr, bundle, mask=mask, smooth=smooth)
    except (ValueError, IndexError) as e:
        raise ValueError("The image has too few valid water pixels to classify.") from e

    # true-colour preview (same stretch as app.py) and class map
    rgb = np.stack([arr[2], arr[1], arr[0]], axis=-1) / 0.15
    rgb = (np.nan_to_num(np.clip(rgb, 0, 1), nan=1.0) * 255).astype(np.uint8)
    cls = np.full(pred.shape + (3,), 251, dtype=np.uint8)  # paper colour background
    for code, col in CLASS_RGB.items():
        cls[(pred == code) & valid] = col

    n_valid = int(valid.sum())
    cover = []
    for code in bundle["le"].classes_:
        n = int(((pred == code) & valid).sum())
        cover.append({"code": int(code), "name": CLASSES.get(int(code), str(code)), "pixels": n,
                      "area_ha": round(n * PIXEL_HA, 2), "percent": round(100 * n / n_valid, 1) if n_valid else 0.0})
    return {
        "image": name if upload is None else "uploaded image",
        "width": int(pred.shape[1]),
        "height": int(pred.shape[0]),
        "classified_pixels": n_valid,
        "reef_mask_used": mask is not None,
        "smoothed": smooth,
        "cover": cover,
        "glint": {k: round(v, 4) if isinstance(v, float) else v for k, v in g.items()},
        "images": {"rgb": _png(np, rgb), "classes": _png(np, cls)},
        "runtime_ms": round((time.perf_counter() - t0) * 1000),
    }
