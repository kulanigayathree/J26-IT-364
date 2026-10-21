"""C4 live detection: runs the C4 pipeline on an uploaded SAR image.

Steps 1–5 (speckle filter → dark-spot mask → clean-up → patches) and the 19 patch features come
from the C4 member's own code in models/C4_oil_spill/ (imported, never changed here).
Step 6 (oil vs look-alike) uses their trained classifier, if a *.joblib file is in
data/external/c4/ (or the folder set by C4_MODEL_DIR). Without it, only steps 1–5 run.
"""

import base64
import json
import os
import sys
import tempfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
C4_CODE = REPO / "models" / "C4_oil_spill"
MODEL_DIR = Path(os.environ.get("C4_MODEL_DIR", REPO / "data" / "external" / "c4"))

MAX_SIDE = 4000  # pixels
DEFAULT_THRESHOLD = 0.5


class C4Unavailable(RuntimeError):
    """The packages or code needed for detection are missing."""


def _pipeline():
    """Import the C4 member's modules (lazy, so the rest of the API works without OpenCV)."""
    if str(C4_CODE) not in sys.path:
        sys.path.insert(0, str(C4_CODE))
    try:
        import c4_features
        import c4_utils
        import cv2
        import numpy as np
    except ImportError as e:
        raise C4Unavailable(
            f"C4 detection needs extra packages ({e.name}). Run: pip install -r requirements.txt"
        ) from e
    return c4_utils, c4_features, cv2, np


# ------------------------------------------------------------------ classifier

_cache: dict = {}


def _find_model_file() -> Path | None:
    if not MODEL_DIR.exists():
        return None
    files = list(MODEL_DIR.rglob("*.joblib")) + list(MODEL_DIR.rglob("*.pkl"))
    if not files:
        return None

    # Prefer the tuned / best model, then the newest file.
    def rank(p: Path):
        name = p.name.lower()
        return (("tuned" in name) + ("best" in name), p.stat().st_mtime)

    return max(files, key=rank)


def _find_meta(model_file: Path) -> dict:
    """A JSON next to the model with "features" and/or "threshold" (saved by C4_04 / C4_04b)."""
    for p in sorted(model_file.parent.glob("*.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        if isinstance(data, dict) and ("threshold" in data or "features" in data):
            return data
    return {}


def load_classifier():
    """Return dict(model, features, threshold, name) or None. Reloads when the file changes."""
    path = _find_model_file()
    if path is None:
        return None
    key = (str(path), path.stat().st_mtime)
    if _cache.get("key") == key:
        return _cache["value"]

    import joblib

    try:
        obj = joblib.load(path)
    except ModuleNotFoundError as e:
        raise C4Unavailable(f"The C4 model file needs the package '{e.name}'. Install it with pip.") from e

    meta = _find_meta(path)
    model = obj
    if isinstance(obj, dict):  # some notebooks save {"model": ..., "threshold": ..., "features": [...]}
        model = obj.get("model", obj)
        meta = {**meta, **{k: v for k, v in obj.items() if k in ("features", "threshold")}}

    features = meta.get("features") or list(getattr(model, "feature_names_in_", [])) or None
    threshold = float(meta.get("threshold", meta.get("best_threshold", DEFAULT_THRESHOLD)))
    value = {"model": model, "features": features, "threshold": threshold, "name": path.name}
    _cache.update(key=key, value=value)
    return value


def _oil_probability(clf, rows: list[dict], default_features: list[str]):
    import pandas as pd

    feats = clf["features"] or default_features
    X = pd.DataFrame(rows)[feats]
    model = clf["model"]
    proba = model.predict_proba(X)
    classes = [str(c).lower() for c in getattr(model, "classes_", [0, 1])]
    idx = classes.index("oil") if "oil" in classes else classes.index("1") if "1" in classes else len(classes) - 1
    return proba[:, idx]


# ------------------------------------------------------------------ detection


def _png_b64(cv2, img) -> str:
    ok, buf = cv2.imencode(".png", img)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()


def classifier_status() -> dict:
    try:
        clf = load_classifier()
    except C4Unavailable as e:
        return {"available": False, "name": None, "threshold": None, "message": str(e)}
    if clf is None:
        return {
            "available": False,
            "name": None,
            "threshold": None,
            "message": "No trained C4 classifier found in data/external/c4/. Showing dark-spot detection only.",
        }
    return {"available": True, "name": clf["name"], "threshold": clf["threshold"], "message": None}


def detect(image_bytes: bytes, filename: str, is_coast: bool = False) -> dict:
    u, cf, cv2, np = _pipeline()
    suffix = Path(filename).suffix.lower() or ".png"
    fd, tmp = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(image_bytes)
        img = cv2.imread(tmp, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Could not read this image. Use a PNG, JPG or GeoTIFF SAR image.")
        h, w = img.shape
        if max(h, w) > MAX_SIDE:
            raise ValueError(f"Image is {w}×{h} px. Please use an image up to {MAX_SIDE} px on its longest side.")

        t0 = time.perf_counter()
        res = u.detect(tmp)  # steps 1–5, C4 member's code
        rows = cf.patch_features(res, int(is_coast))  # 19 features per patch
    finally:
        os.remove(tmp)

    status = classifier_status()
    probs = None
    if status["available"] and rows:
        clf = load_classifier()
        probs = _oil_probability(clf, rows, cf.FEATURES)

    patches = []
    for i, (p, row) in enumerate(zip(res["props"], rows)):
        mask = (res["labels"] == p.label).astype(np.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        outline = []
        if contours:
            c = max(contours, key=cv2.contourArea)
            c = cv2.approxPolyDP(c, 1.0, True)
            outline = [[int(x), int(y)] for x, y in c.reshape(-1, 2)]
        prob = float(probs[i]) if probs is not None else None
        verdict = "dark spot" if prob is None else ("oil" if prob >= status["threshold"] else "look-alike")
        r0, c0, r1, c1 = p.bbox
        patches.append({
            "id": i + 1,
            "verdict": verdict,
            "probability": prob,
            "area_px": int(p.area),
            "elongation": round(row["elongation"], 2),
            "contrast": round(row["contrast"], 3),
            "bbox": [int(c0), int(r0), int(c1), int(r1)],
            "outline": outline,
        })
    patches.sort(key=lambda x: (x["probability"] is None, -(x["probability"] or 0), -x["area_px"]))

    return {
        "width": int(w),
        "height": int(h),
        "classifier": status,
        "n_patches": len(patches),
        "n_oil": sum(1 for x in patches if x["verdict"] == "oil"),
        "patches": patches,
        "images": {
            "original": _png_b64(cv2, res["img"]),
            "filtered": _png_b64(cv2, res["filtered"]),
            "mask": _png_b64(cv2, (res["clean"].astype(np.uint8) * 255)),
        },
        "runtime_ms": round((time.perf_counter() - t0) * 1000),
    }
