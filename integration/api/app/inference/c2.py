"""C2 test-forecast replay: shows the C2 model's saved 2025 test forecasts for any date.

The C2 notebooks (C2_3 / C2_4 / C2_5 / C2_6) save, for every 2025 test day, the calibrated
MC-dropout forecast for the next 3 days:
    results/{unet|convlstm|convgru}_test_predictions.npz  -> mean, std (n, 3, 40, 44), ids (n,)
    results/ensemble_test_predictions.npz                  -> mean (n, 3, 40, 44), ids (n,)
ids[i] = index of the last input day t in the data cube; lead k (1..3) forecasts day t + k.
The data cube (datacube_0p25.nc) gives the dates, the land mask (depth) and the ACTUAL fishing.

Files go in data/external/c2/ (or C2_DATA_DIR). Nothing is re-trained or re-run here: these are
exactly the numbers the notebook computed, shown next to what really happened.
"""

import os
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
DATA_DIR = Path(os.environ.get("C2_DATA_DIR", REPO / "data" / "external" / "c2"))

MODELS = {
    "ensemble": "Ensemble (average of deep models)",
    "convlstm": "ConvLSTM (space + time)",
    "convgru": "ConvGRU (space + time)",
    "unet": "U-Net (space only)",
}
LEADS = 3


class C2Unavailable(RuntimeError):
    pass


def _libs():
    try:
        import numpy as np
        import pandas as pd
        import xarray as xr
        from sklearn.metrics import average_precision_score, roc_auc_score
    except ImportError as e:
        raise C2Unavailable(f"C2 replay needs extra packages ({e.name}). Run: pip install -r requirements.txt") from e
    return np, pd, xr, roc_auc_score, average_precision_score


def _files() -> tuple[Path | None, dict[str, Path]]:
    if not DATA_DIR.exists():
        return None, {}
    cubes = [p for p in DATA_DIR.rglob("*.nc") if "datacube" in p.name.lower()]
    preds = {}
    for key in MODELS:
        found = sorted(DATA_DIR.rglob(f"{key}_test_predictions.npz"))
        if found:
            preds[key] = found[0]
    return (cubes[0] if cubes else None), preds


_cache: dict = {}


def _load() -> dict:
    cube_path, pred_paths = _files()
    if cube_path is None or not pred_paths:
        missing = []
        if cube_path is None:
            missing.append("the data cube (datacube_0p25.nc)")
        if not pred_paths:
            missing.append("the results folder with *_test_predictions.npz")
        raise C2Unavailable("Put " + " and ".join(missing) + " from MyDrive/C2_data in data/external/c2/.")
    key = (str(cube_path), cube_path.stat().st_mtime, tuple(sorted((k, str(p), p.stat().st_mtime) for k, p in pred_paths.items())))
    if _cache.get("key") == key:
        return _cache["value"]

    np, pd, xr, *_ = _libs()
    with xr.open_dataset(cube_path) as X:
        days = pd.DatetimeIndex(X["time"].values)
        lat = X["latitude"].values.astype(float)
        lon = X["longitude"].values.astype(float)
        depth = X["depth"]
        ocean = (depth.isel(time=0) if "time" in depth.dims else depth).notnull().values
        fishing = X["fishing"].values.astype("float32")  # (time, H, W), NaN on land

    preds = {}
    for k, p in pred_paths.items():
        z = np.load(p)
        preds[k] = {"mean": z["mean"], "std": z["std"] if "std" in z.files else None, "ids": z["ids"].astype(int)}

    # ensemble uncertainty = average MC-dropout std of its members (the ensemble file has no std)
    if "ensemble" in preds and preds["ensemble"]["std"] is None:
        members = [k for k in ("unet", "convlstm", "convgru") if k in preds and preds[k]["std"] is not None]
        if members:
            ids = preds["ensemble"]["ids"]
            stds = []
            for m in members:
                pos = {int(t): i for i, t in enumerate(preds[m]["ids"])}
                if all(int(t) in pos for t in ids):
                    stds.append(preds[m]["std"][[pos[int(t)] for t in ids]].astype("float32"))
            if stds:
                preds["ensemble"]["std"] = np.mean(stds, 0)
                preds["ensemble"]["std_note"] = "average of member MC-dropout spreads (" + ", ".join(members) + ")"

    best = None
    for p in DATA_DIR.rglob("best_model.txt"):
        best = p.read_text(encoding="utf-8").strip()[:200]
        break

    # lat must be ascending (south -> north) like the website grid
    flip = lat[0] > lat[-1]
    value = {"days": days, "lat": lat[::-1] if flip else lat, "lon": lon, "flip": flip, "ocean": ocean[::-1] if flip else ocean,
             "fishing": fishing[:, ::-1] if flip else fishing, "preds": preds, "best": best}
    _cache.update(key=key, value=value)
    return value


def status() -> dict:
    try:
        d = _load()
    except C2Unavailable as e:
        return {"available": False, "message": str(e), "models": [], "first_date": None, "last_date": None, "best_model": None}
    models = []
    first, last = None, None
    for k in MODELS:
        if k not in d["preds"]:
            continue
        p = d["preds"][k]
        dates = d["days"][p["ids"] + 1]
        first = min(first, dates.min()) if first is not None else dates.min()
        last = max(last, dates.max()) if last is not None else dates.max()
        models.append({"key": k, "label": MODELS[k], "has_uncertainty": p["std"] is not None,
                       "uncertainty_note": p.get("std_note")})
    return {"available": True, "message": None, "models": models, "first_date": str(first.date()),
            "last_date": str(last.date()), "best_model": d["best"]}


def _grid(np, a, ocean):
    a = np.where(ocean, a.astype("float32"), np.nan)
    return [[None if not np.isfinite(v) else round(float(v), 4) for v in row] for row in a]


def replay(date: str, model: str) -> dict:
    np, pd, _xr, roc_auc_score, average_precision_score = _libs()
    d = _load()
    if model not in d["preds"]:
        raise ValueError(f"Model '{model}' is not available.")
    p = d["preds"][model]
    try:
        day1 = pd.Timestamp(date).normalize()
    except ValueError as e:
        raise ValueError("Use a date like 2025-06-14.") from e
    t0 = time.perf_counter()

    # sample whose Day 1 (t + 1) is the chosen date
    day1_of = d["days"][p["ids"] + 1].normalize()
    hits = np.where(day1_of == day1)[0]
    if not len(hits):
        raise ValueError(f"No saved forecast starts on {day1.date()}. Choose a date in the 2025 test period.")
    i = int(hits[0])
    t = int(p["ids"][i])
    ocean = d["ocean"]

    leads = []
    for k in range(LEADS):
        mean = p["mean"][i, k].astype("float32")
        std = p["std"][i, k].astype("float32") if p["std"] is not None else None
        if d["flip"]:
            mean = mean[::-1]
            std = std[::-1] if std is not None else None
        actual = d["fishing"][t + 1 + k]
        y = np.nan_to_num(actual[ocean]).astype(int)
        s = mean[ocean]
        metrics = {"fishing_cells": int(y.sum()), "sea_cells": int(ocean.sum()), "roc_auc": None, "pr_auc": None,
                   "top10_capture": None}
        if 0 < y.sum() < len(y):
            metrics["roc_auc"] = round(float(roc_auc_score(y, s)), 3)
            metrics["pr_auc"] = round(float(average_precision_score(y, s)), 3)
            top = s >= np.quantile(s, 0.9)
            metrics["top10_capture"] = round(float(y[top].sum() / y.sum()), 3)
        leads.append({
            "lead": k + 1,
            "date": str(d["days"][t + 1 + k].date()),
            "probability": _grid(np, mean, ocean),
            "uncertainty": _grid(np, std, ocean) if std is not None else None,
            "actual": _grid(np, np.nan_to_num(actual), ocean),
            "metrics": metrics,
        })
    return {
        "model": model,
        "model_label": MODELS[model],
        "issued_after": str(d["days"][t].date()),
        "lat": [round(float(v), 4) for v in d["lat"]],
        "lon": [round(float(v), 4) for v in d["lon"]],
        "cell_size": round(float(abs(d["lat"][1] - d["lat"][0])), 4),
        "leads": leads,
        "runtime_ms": round((time.perf_counter() - t0) * 1000),
    }
