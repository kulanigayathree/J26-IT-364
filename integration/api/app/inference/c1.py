"""C1 live analysis: runs the trained C1 model on a vessel track.

Uses the C1 member's own code from models/C1_vessel_anomaly/ (imported, never changed), in the same
order as their run_c1.py: clean -> per-ping features -> 10-ping windows -> time-decay GRU
autoencoder score -> transmission-gap analyzer -> threshold -> anomaly type (classifier + rules).

Trained files come from a C1 results folder (model.pt, scaler.json, score_scale.json, run_info.json,
optional type_clf.joblib, optional test_tracks.csv for examples) inside data/external/c1/
(or the folder set by C1_MODEL_DIR).
"""

import io
import json
import os
import sys
import time
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
C1_CODE = REPO / "models" / "C1_vessel_anomaly"
MODEL_ROOT = Path(os.environ.get("C1_MODEL_DIR", REPO / "data" / "external" / "c1"))

WINDOW = 10  # pings per window (c1_config: windows.size)
STRIDE = 1  # score every ping position
DATA_CFG = {"max_gap_hours": 6, "min_track_pings": 20}
MAX_ROWS = 200_000
MAX_POINTS = 2000  # points sent back for the map / chart

INJECT_TYPES = {"spoof": "Spoofing", "gap": "Gap (AIS off)", "slowdown": "Slowdown", "zigzag": "Zigzag"}
COLUMN_ALIASES = {
    "mmsi": ["mmsi", "vessel_id", "id"],
    "time": ["time", "timestamp", "basedatetime", "datetime", "date_time"],
    "lat": ["lat", "latitude"],
    "lon": ["lon", "lng", "long", "longitude"],
    "sog": ["sog", "speed"],
    "cog": ["cog", "course"],
}


class C1Unavailable(RuntimeError):
    """Packages or trained files are missing."""


def _modules():
    if str(C1_CODE) not in sys.path:
        sys.path.insert(0, str(C1_CODE))
    try:
        import numpy as np
        import pandas as pd
        import torch

        import features as ft
        import inject as inj
        import model as md
        import type_features as tf
    except ImportError as e:
        raise C1Unavailable(f"C1 analysis needs extra packages ({e.name}). Run: pip install -r requirements.txt") from e
    return np, pd, torch, ft, md, tf, inj


def _run_dir() -> Path | None:
    if not MODEL_ROOT.exists():
        return None
    found = sorted(MODEL_ROOT.rglob("model.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
    return found[0].parent if found else None


_cache: dict = {}


def load_bundle() -> dict:
    run = _run_dir()
    if run is None:
        raise C1Unavailable("No trained C1 model found. Put the C1 results folder (with model.pt) in data/external/c1/.")
    key = (str(run), (run / "model.pt").stat().st_mtime)
    if _cache.get("key") == key:
        return _cache["value"]

    np, _pd, torch, ft, md, _tf, _inj = _modules()
    for name in ("scaler.json", "score_scale.json", "run_info.json"):
        if not (run / name).exists():
            raise C1Unavailable(f"The C1 results folder is missing {name}.")
    scaler = json.loads((run / "scaler.json").read_text(encoding="utf-8"))
    if scaler.get("features") != ft.FEATURES:
        raise C1Unavailable("scaler.json features do not match the C1 code in models/C1_vessel_anomaly.")
    info = json.loads((run / "run_info.json").read_text(encoding="utf-8"))

    state = torch.load(run / "model.pt", map_location="cpu", weights_only=True)
    hidden = state["enc_cell.weight_hh"].shape[1]
    latent = state["to_latent.weight"].shape[0]
    net = md.TimeDecayGRUAE(len(ft.FEATURES), hidden, latent)
    net.load_state_dict(state)
    net.eval()

    type_clf = None
    if (run / "type_clf.joblib").exists():
        import joblib

        obj = joblib.load(run / "type_clf.joblib")
        type_clf = obj.get("model") if isinstance(obj, dict) else obj

    metrics = {}
    if (run / "metrics.json").exists():
        rows = json.loads((run / "metrics.json").read_text(encoding="utf-8"))
        full = next((r for r in rows if "full" in r.get("model", "").lower()), rows[0] if rows else {})
        metrics = {k: full.get(k) for k in ("model", "roc_auc", "pr_auc", "precision", "recall", "f1", "far")}

    value = {
        "run": run,
        "net": net,
        "mean": np.array(scaler["mean"], dtype=np.float32),
        "std": np.array(scaler["std"], dtype=np.float32),
        "scale": float(json.loads((run / "score_scale.json").read_text(encoding="utf-8"))["scale"]),
        "threshold": float(info["full_engine_threshold"]),
        "gap_s": float(info["gap_trigger_s_used"]),
        "type_clf": type_clf,
        "metrics": metrics,
        "info": info,
    }
    _cache.update(key=key, value=value)
    return value


# ------------------------------------------------------------------ inputs


def _examples_df():
    """Tracks from the C1 evaluation set (test_tracks.csv in the results folder)."""
    run = _run_dir()
    if run is None or not (run / "test_tracks.csv").exists():
        return None
    if _cache.get("examples_key") != str(run):
        _np, pd, *_ = _modules()
        df = pd.read_csv(run / "test_tracks.csv")
        df["anom_type"] = df["anom_type"].fillna("")
        _cache.update(examples_key=str(run), examples=df)
    return _cache["examples"]


def list_examples(limit: int = 8) -> list[dict]:
    df = _examples_df()
    if df is None:
        return []
    rows = []
    for tid, g in df.groupby("track_id", sort=False):
        if len(g) < 40:
            continue
        kinds = sorted({INJECT_TYPES.get(k, k) for k in g["anom_type"] if k})
        rows.append({"id": str(tid), "mmsi": str(g["mmsi"].iloc[0]), "pings": int(len(g)),
                     "start": str(g["time"].iloc[0]), "end": str(g["time"].iloc[-1]), "injected": kinds})
    # half with injected test anomalies, half clean
    with_inj = [r for r in rows if r["injected"]][: limit // 2]
    clean = [r for r in rows if not r["injected"]][: limit - len(with_inj)]
    return with_inj + clean


def read_upload(data: bytes):
    _np, pd, *_ = _modules()
    try:
        raw = pd.read_csv(io.BytesIO(data), nrows=MAX_ROWS + 1)
    except Exception as e:  # noqa: BLE001 - any parse error is the user's file
        raise ValueError(f"Could not read the CSV file ({e}).") from e
    if len(raw) > MAX_ROWS:
        raise ValueError(f"The file has more than {MAX_ROWS:,} rows. Upload one or a few vessels.")
    lower = {c.lower().strip(): c for c in raw.columns}
    out = pd.DataFrame()
    missing = []
    for std, names in COLUMN_ALIASES.items():
        col = next((lower[n] for n in names if n in lower), None)
        if col is None:
            if std == "mmsi":
                out["mmsi"] = 1
                continue
            missing.append(std)
        else:
            out[std] = raw[col]
    if missing:
        raise ValueError(
            "The CSV needs columns for: " + ", ".join(missing)
            + ". Accepted names: time/timestamp, lat/latitude, lon/longitude, sog/speed, cog/course (mmsi optional)."
        )
    return out


def example_track(example_id: str):
    df = _examples_df()
    if df is None:
        raise ValueError("No example tracks are available.")
    g = df[df["track_id"].astype(str) == str(example_id)]
    if g.empty:
        raise ValueError(f"Unknown example track {example_id}.")
    return g


# ------------------------------------------------------------------ analysis


def _thin(n: int, limit: int):
    step = max(1, -(-n // limit))
    return range(0, n, step)


def analyse(raw_df, inject: str | None = None, seed: int = 7) -> dict:
    np, pd, torch, ft, md, tf, inj = _modules()
    b = load_bundle()
    t0 = time.perf_counter()

    truth = None
    if "anom_type" in raw_df.columns:  # example tracks carry the injected labels from C1's evaluation
        truth = raw_df[["mmsi", "time", "anom_type"]].copy()
        truth["time"] = pd.to_datetime(truth["time"], utc=True, errors="coerce")
        truth["mmsi"] = pd.to_numeric(truth["mmsi"], errors="coerce").astype("int64")
        truth = truth.drop_duplicates(subset=["mmsi", "time"])

    df = ft.clean_and_segment(raw_df[ft.STD_COLS].copy(), DATA_CFG)
    if df.empty:
        raise ValueError(f"No usable track: each vessel needs at least {DATA_CFG['min_track_pings']} valid pings.")
    if truth is not None:
        df = df.drop(columns=["anom_type"]).merge(truth, on=["mmsi", "time"], how="left")
        df["anom_type"] = df["anom_type"].fillna("")
        df["anom"] = (df["anom_type"] != "").astype(int)
    if inject:
        if inject not in INJECT_TYPES:
            raise ValueError(f"Unknown anomaly type '{inject}'.")
        df = inj.inject(df, seed, frac_tracks=1.0, types=[inject])

    feats = ft.compute_features(df)
    try:
        X, R, _y, ty, meta = ft.make_windows(feats, WINDOW, STRIDE)
    except SystemExit as e:
        raise ValueError("The track is too short to make 10-ping windows.") from e

    Xs = ((X - b["mean"]) / b["std"]).astype(np.float32)
    err = md.reconstruction_error(b["net"], Xs)
    score_ae = err / (err + b["scale"] + 1e-12)
    gap_hit = R[:, :, 0].max(1) > b["gap_s"]
    score = np.maximum(score_ae, gap_hit.astype(float))
    flagged = score >= b["threshold"]

    # anomaly type for flagged windows: gap rule first, then the trained classifier, then simple rules
    types = np.array([""] * len(score), dtype=object)
    idx = np.where(flagged)[0]
    if len(idx):
        clf_pred = None
        if b["type_clf"] is not None:
            V = np.stack([tf.window_vector(X[i]) for i in idx])
            clf_pred = b["type_clf"].predict(V)
        for k, i in enumerate(idx):
            if gap_hit[i]:
                types[i] = "Gap (AIS off)"
                continue
            name = tf.CLASSES[int(clf_pred[k])] if clf_pred is not None else "normal"
            types[i] = name if name != "normal" else tf.rule_type(X[i])

    # merge consecutive flagged windows of the same track into events
    events = []
    cur = None
    for i in range(len(score)):
        same_track = cur is not None and meta["track_id"].iloc[i] == cur["track_id"] and i == cur["last"] + 1
        if flagged[i] and same_track:
            cur["last"] = i
            cur["idx"].append(i)
        elif flagged[i]:
            if cur:
                events.append(cur)
            cur = {"track_id": meta["track_id"].iloc[i], "first": i, "last": i, "idx": [i]}
        elif cur and not flagged[i]:
            events.append(cur)
            cur = None
    if cur:
        events.append(cur)

    names = {v: k for k, v in ft.ANOM_CODES.items()}
    out_events = []
    for n, e in enumerate(events, 1):
        ii = e["idx"]
        peak = max(ii, key=lambda i: score[i])
        kind = Counter(types[i] for i in ii).most_common(1)[0][0]
        injected = sorted({INJECT_TYPES.get(names.get(int(ty[i]), ""), "") for i in ii if ty[i] > 0} - {""})
        out_events.append({
            "id": n,
            "type": kind,
            "max_score": round(float(score[peak]), 3),
            "start": str(meta["t_end"].iloc[ii[0]]),
            "end": str(meta["t_end"].iloc[ii[-1]]),
            "lat": float(meta["lat_end"].iloc[peak]),
            "lon": float(meta["lon_end"].iloc[peak]),
            "windows": len(ii),
            "injected": injected,
        })

    pts = df.sort_values(["track_id", "time"]).reset_index(drop=True)
    track = [{"t": str(pts["time"].iloc[i]), "lat": float(pts["lat"].iloc[i]), "lon": float(pts["lon"].iloc[i]),
              "sog": float(pts["sog"].iloc[i]), "track": int(pts["track_id"].iloc[i]),
              "injected": bool(pts["anom"].iloc[i])} for i in _thin(len(pts), MAX_POINTS)]
    timeline = [{"t": str(meta["t_end"].iloc[i]), "score": round(float(score[i]), 4), "flagged": bool(flagged[i]),
                 "injected": bool(ty[i] > 0)} for i in _thin(len(score), MAX_POINTS)]

    injected_windows = int((ty > 0).sum())
    caught = int(((ty > 0) & flagged).sum())
    return {
        "summary": {
            "pings": int(len(df)),
            "vessels": int(df["mmsi"].nunique()),
            "tracks": int(df["track_id"].nunique()),
            "windows": int(len(score)),
            "flagged_windows": int(flagged.sum()),
            "events": len(out_events),
            "injected_windows": injected_windows,
            "injected_caught": caught,
            "threshold": round(b["threshold"], 4),
            "gap_trigger_s": round(b["gap_s"]),
            "runtime_ms": round((time.perf_counter() - t0) * 1000),
        },
        "events": out_events,
        "track": track,
        "timeline": timeline,
    }


def status() -> dict:
    try:
        b = load_bundle()
    except C1Unavailable as e:
        return {"available": False, "message": str(e), "model": None, "threshold": None, "metrics": None, "examples": []}
    return {
        "available": True,
        "message": None,
        "model": f"TimeDecay-GRU-AE + gap analyzer ({b['run'].name})",
        "threshold": round(b["threshold"], 4),
        "metrics": b["metrics"],
        "examples": list_examples(),
    }
