"""C1 streaming engine: scores AIS pings ONE AT A TIME, as they arrive.

For every vessel (MMSI) it keeps the last `window` pings, builds exactly the same features as
features.py, and asks the trained time-decay GRU autoencoder for an anomaly score in [0, 1).
No human step in between: ping in -> clean -> features -> model -> alert.

It needs the files written by run_c1.py:  results_c1/model.pt, scaler.json, metrics.json
and, once, the training csv (to calibrate the score scale; the result is cached in score_scale.json).
"""
import json
import os
import sys
import threading
import time
from collections import deque

import numpy as np
import pandas as pd
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import features as ft  # noqa: E402
import model as md  # noqa: E402
import type_features as tf  # noqa: E402
import geofence as gf  # noqa: E402


def _to_ts(x):
    """Accepts ISO text, pandas Timestamp, or unix epoch (seconds / milliseconds)."""
    if isinstance(x, (int, float, np.integer, np.floating)):
        return pd.to_datetime(x, unit="ms" if x > 1e11 else "s", utc=True)
    return pd.to_datetime(x, utc=True)


class StreamEngine:
    # A vessel is judged on its WHOLE recent trip, not on one signal: it is called anomalous only when at
    # least VESSEL_SHARE of its last VESSEL_WINDOW scored windows are over the threshold (a normal vessel
    # is over it at most ~5% of the time) and at least VESSEL_MIN windows are over it.
    VESSEL_WINDOW = 60
    VESSEL_SHARE = 0.15
    VESSEL_MIN = 6
    BLACKOUT_S = 1200      # silence longer than 20 min = transponder blackout (proposal FR5)
    V_MAX_KN = 15.0        # fastest a fishing vessel can plausibly go: sets the size of the search area
    MIN_EVAL = 20          # a trip needs this many scored windows before its verdict is counted in the accuracy

    def __init__(self, results_dir, csv_path=None, config_path=None, threshold=None):
        self.results_dir = str(results_dir)
        self.cfg = ft.load_config(config_path or os.path.join(HERE, "c1_config.yaml"))
        self.size = self.cfg["windows"]["size"]
        self.max_gap_s = self.cfg["data"]["max_gap_hours"] * 3600

        with open(os.path.join(self.results_dir, "scaler.json")) as f:
            sc = json.load(f)
        self.scaler = ft.Scaler()
        self.scaler.mean = np.array(sc["mean"], dtype=np.float32)
        self.scaler.std = np.array(sc["std"], dtype=np.float32)

        m = self.cfg["model"]
        arch = "gru"                                           # which autoencoder was trained (gru / lstm)
        ap_ = os.path.join(self.results_dir, "model_arch.json")
        if os.path.exists(ap_):
            with open(ap_) as f:
                ai = json.load(f)
            arch, m = ai.get("arch", "gru"), dict(m, hidden=ai.get("hidden", m["hidden"]), latent=ai.get("latent", m["latent"]))
        self.arch = arch
        self.model = md.build_model(arch, len(ft.FEATURES), m["hidden"], m["latent"])
        self.model.load_state_dict(torch.load(os.path.join(self.results_dir, "model.pt"), map_location="cpu"))
        self.model.eval()

        if threshold is None:
            with open(os.path.join(self.results_dir, "metrics.json")) as f:
                res = json.load(f)
            label = md.ARCH_LABEL.get(self.arch, "TimeDecay-GRU-AE")
            hit = [r for r in res if r["model"].startswith(label)] or [r for r in res if r["model"].startswith("TimeDecay")] or res
            threshold = hit[0]["threshold"]
        self.threshold = float(threshold)
        self.scale = self._load_or_calibrate(csv_path)

        self.type_clf, self.type_source = None, "rules"
        np_path = os.path.join(self.results_dir, "type_clf_np.npz")      # scikit-learn-free copy (works on any computer)
        if os.path.exists(np_path):
            try:
                from np_forest import NPForest
                self.type_clf = NPForest.load(np_path)
                self.type_source = "trained classifier"
            except Exception:                                  # noqa: BLE001
                self.type_clf = None
        tp_path = os.path.join(self.results_dir, "type_clf.joblib")
        if self.type_clf is None and os.path.exists(tp_path):
            try:
                import joblib
                self.type_clf = joblib.load(tp_path)["model"]
                self.type_source = "trained classifier"
            except Exception:                                  # noqa: BLE001
                self.type_clf = None

        self.eez = gf.load_default(__file__)                    # None when data/raw/sri_lanka_eez.geojson is missing
        self.lock = threading.Lock()
        self.reset()

    # ------------------------------------------------------------------ setup
    def _load_or_calibrate(self, csv_path):
        cache = os.path.join(self.results_dir, "score_scale.json")
        if os.path.exists(cache):
            with open(cache) as f:
                return float(json.load(f)["scale"])
        if not csv_path or not os.path.exists(str(csv_path)):
            raise SystemExit(
                "score_scale.json not found and the training csv was not given/found.\n"
                "Pass csv_path (e.g. data/raw/trawlers_small.csv) once so the engine can calibrate."
            )
        # same clean hold-out tracks that run_c1.py used to define "normal reconstruction error"
        sp, w = self.cfg["split"], self.cfg["windows"]
        df = ft.load_tracks(str(csv_path), self.cfg)
        tr, _, _ = ft.split_by_mmsi(df, sp, sp["seed"])
        tids = tr["track_id"].unique()
        rng = np.random.default_rng(sp["seed"] + 3)
        es_ids = set(rng.choice(tids, max(1, len(tids) // 10), replace=False))
        es = tr[tr["track_id"].isin(es_ids)]
        X = ft.make_windows(ft.compute_features(es), w["size"], w["stride"])[0]
        err = md.reconstruction_error(self.model, self.scaler.transform(X))
        scale = float(np.quantile(err, self.cfg["model"]["score_ref_quantile"]))
        with open(cache, "w") as f:
            json.dump({"scale": scale, "n_reference_windows": int(len(err))}, f)
        return scale

    def reset(self):
        with self.lock:
            self.state = {}
            self.vessels = {}
            self.alerts = deque(maxlen=500)
            self.recent = deque(maxlen=600)
            self.n_pings = self.n_scored = self.n_alerts = self.n_rejected = 0
            self.lat_sum = 0.0
            self.vessel_log = deque(maxlen=300)           # confirmed-anomalous-vessel detections
            self.n_detections = 0
            self.blackouts = deque(maxlen=200)            # transponder blackouts + dead-reckoning search areas (FR5)
            self.n_blackouts = 0
            self.eez_events = deque(maxlen=200)           # vessels that crossed into the Sri Lankan EEZ (FR3)
            self.n_eez_entries = 0
            self.type_hits = self.type_total = 0
            self.type_counts = {}                         # how many confirmed anomalous vessels of each type
            self.vt = {"tp": 0, "fp": 0, "tn": 0, "fn": 0}  # verdicts of FINISHED trips (replay ground truth)
            self.tp = self.fp = self.tn = self.fn = 0     # only meaningful when pings carry replay ground truth

    def set_threshold(self, thr):
        self.threshold = float(thr)

    @staticmethod
    def classify(rows):
        """Fallback naming by simple physical rules (used when no trained type classifier is available)."""
        return tf.rule_type(rows)

    def name_type(self, rows):
        """Which KIND of unusual behaviour? The trained type classifier votes over the recent windows;
        without it, simple rules decide. (The neural network itself only says 'unusual'.)"""
        rows = list(rows)
        if self.type_clf is None or len(rows) < self.size:
            return tf.rule_type(rows)
        arr = np.array(rows, dtype=np.float64)
        starts = list(range(0, len(arr) - self.size + 1, 3))
        if starts[-1] != len(arr) - self.size:
            starts.append(len(arr) - self.size)
        vec = np.stack([tf.window_vector(arr[k:k + self.size]) for k in starts])
        try:
            pred = self.type_clf.predict(vec)
        except Exception:                                       # noqa: BLE001  (e.g. scikit-learn version mismatch) -> rules
            self.type_clf, self.type_source = None, "rules"
            return tf.rule_type(rows)
        pred = pred[pred > 0]
        if len(pred) == 0:                                      # classifier unsure -> the simple physical rules decide
            return tf.rule_type(rows)
        return tf.CLASSES[int(np.bincount(pred).argmax())]

    _TRUTH_NAME = {"spoof": "Spoofing", "gap": "Gap (AIS off)", "slowdown": "Slowdown", "zigzag": "Zigzag"}

    def _evidence(self, hist):
        k = sum(hist)
        return k >= self.VESSEL_MIN and k / float(max(len(hist), 30)) >= self.VESSEL_SHARE

    def _verdict_key(self, st):
        p, t = st["conf"], st["tconf"]
        return ("tp" if t else "fp") if p else ("fn" if t else "tn")

    def _finalize(self, st):
        if st["n_win"] >= self.MIN_EVAL:
            self.vt[self._verdict_key(st)] += 1

    # ---------------------------------------------------------------- scoring
    def process(self, ping):
        """ping: dict with mmsi, time, lat, lon, sog, cog (extra keys 'true_anom','true_type' are optional,
        they exist only when replaying labelled data). Returns a result dict."""
        t0 = time.perf_counter()
        try:
            mmsi = int(ping["mmsi"])
            lat, lon = float(ping["lat"]), float(ping["lon"])
            sog, cog = float(ping["sog"]), float(ping["cog"])
            ts = _to_ts(ping["time"])
            ok = (-90 <= lat <= 90) and (-180 <= lon <= 180) and (0 <= sog <= 102.2) and (0 <= cog < 360) and not pd.isna(ts)
        except (KeyError, TypeError, ValueError):
            ok = False
        if not ok:
            with self.lock:
                self.n_rejected += 1
            return {"status": "rejected"}

        truth = bool(ping.get("true_anom", 0))
        with self.lock:
            self.n_pings += 1
            st = self.state.get(mmsi)
            if st is not None:
                dt = (ts - st["time"]).total_seconds()
                if dt <= 0:
                    self.n_rejected += 1
                    return {"status": "rejected"}
                if dt >= self.BLACKOUT_S:
                    self._blackout(mmsi, st, ts, lat, lon, dt)
                if dt > self.max_gap_s:           # very long silence: start a new track
                    self._finalize(st)
                    st = None
            if st is None:
                st = {"time": ts, "lat": lat, "lon": lon, "sog": sog, "cog": cog,
                      "feats": deque(maxlen=self.size), "truth": deque(maxlen=self.size),
                      "rows": deque(maxlen=30), "ttypes": deque(maxlen=30),
                      "hist": deque(maxlen=self.VESSEL_WINDOW), "thist": deque(maxlen=self.VESSEL_WINDOW),
                      "n_win": 0, "peak": 0.0, "conf": False, "tconf": False,
                      "in_eez": self._eez_check(mmsi, ts, lat, lon, None)}
                self.state[mmsi] = st
                res = self._result(mmsi, ts, lat, lon, sog, cog, "warming_up", None, False, ping, truth)
                self._remember(res)
                return res

            dt = max(1.0, dt)
            dist = float(ft._haversine_nm(st["lat"], st["lon"], lat, lon))
            implied = min(max(dist / (dt / 3600.0), 0.0), 500.0)
            dcog = ((cog - st["cog"] + 180.0) % 360.0) - 180.0
            rot = float(np.clip(dcog / dt * 60.0, -720, 720))
            accel = float(np.clip((sog - st["sog"]) / dt * 60.0, -100, 100))
            row = [np.log1p(dt), sog, np.sin(np.radians(cog)), np.cos(np.radians(cog)),
                   float(ft._slog(rot)), float(ft._slog(accel)), np.log1p(implied)]
            st["feats"].append(row)
            st["rows"].append(row)
            st["ttypes"].append(str(ping.get("true_type", "") or ""))
            st["truth"].append(truth)
            st.update(time=ts, lat=lat, lon=lon, sog=sog, cog=cog)
            st["in_eez"] = self._eez_check(mmsi, ts, lat, lon, st.get("in_eez"))

            if len(st["feats"]) < self.size:
                res = self._result(mmsi, ts, lat, lon, sog, cog, "warming_up", None, False, ping, truth)
                self._remember(res)
                return res
            window = np.array(list(st["feats"]), dtype=np.float32)[None]
            truth_window = any(st["truth"])

        X = self.scaler.transform(window)                          # model runs outside the lock
        with torch.no_grad():
            xb = torch.from_numpy(X)
            err = float(((self.model(xb) - xb[:, :, 1:]) ** 2).mean())
        score = err / (err + self.scale + 1e-12)
        flagged = score >= self.threshold
        with self.lock:
            res = self._result(mmsi, ts, lat, lon, sog, cog, "scored", score, flagged, ping, truth_window)
            res["latency_ms"] = (time.perf_counter() - t0) * 1000.0
            self.n_scored += 1
            self.lat_sum += res["latency_ms"]
            if truth_window and flagged:
                self.tp += 1
            elif flagged:
                self.fp += 1
            elif truth_window:
                self.fn += 1
            else:
                self.tn += 1
            if flagged:
                self.n_alerts += 1
                self.alerts.append(res)
            st["hist"].append(bool(flagged))
            st["thist"].append(bool(truth_window))
            st["n_win"] += 1
            st["peak"] = max(st["peak"], score)
            if not st["conf"] and self._evidence(st["hist"]):
                st["conf"] = True
                self.n_detections += 1
                kind = self.name_type(st["rows"])
                self.type_counts[kind] = self.type_counts.get(kind, 0) + 1
                real = [t for t in st["ttypes"] if t]
                real = self._TRUTH_NAME.get(max(set(real), key=real.count), "") if real else ""
                if real:                                   # replay ground truth exists: was the named type right?
                    self.type_total += 1
                    self.type_hits += int(kind == real)
                self.vessel_log.append({"mmsi": mmsi, "time": res["time"], "lat": lat, "lon": lon, "sog": sog,
                                        "score": st["peak"], "n_flagged": int(sum(st["hist"])),
                                        "n_windows": len(st["hist"]), "type": kind, "true_type": real,
                                        "in_eez": st.get("in_eez")})
            if not st["tconf"] and self._evidence(st["thist"]):
                st["tconf"] = True
            res["vconf"] = st["conf"]
            self.recent.append(score)
            self._remember(res)
        return res

    def _eez_check(self, mmsi, ts, lat, lon, was_inside):
        """True / False = inside / outside the Sri Lankan EEZ; None = geofence switched off (no polygon file).
        An entry event is logged when a vessel that was outside is now inside."""
        if self.eez is None:
            return None
        inside = self.eez.contains(lon, lat)
        if inside and was_inside is False:
            self.n_eez_entries += 1
            self.eez_events.append({"mmsi": mmsi, "time": ts.isoformat(), "lat": lat, "lon": lon})
        return inside

    def _blackout(self, mmsi, st, ts, lat, lon, dt):
        """The vessel was silent for `dt` s. Dead reckoning: from its last known position, speed and course,
        where could it be now? Result = a search circle (radius = fastest plausible speed x silence) around the
        last known position, plus the straight-line dead-reckoned point. Meant to be handed to satellite SAR (FR5)."""
        h = dt / 3600.0
        la0, lo0, sog0, cog0 = st["lat"], st["lon"], st["sog"], st["cog"]
        coslat = max(np.cos(np.radians(la0)), 0.05)
        dr_lat = la0 + sog0 * h * np.cos(np.radians(cog0)) / 60.0
        dr_lon = lo0 + sog0 * h * np.sin(np.radians(cog0)) / (60.0 * coslat)
        r_nm = float(min(self.V_MAX_KN * h, 150.0))
        dlat, dlon = r_nm / 60.0, r_nm / (60.0 * coslat)
        self.n_blackouts += 1
        self.blackouts.append({
            "mmsi": mmsi, "last_seen": st["time"].isoformat(), "reappeared": ts.isoformat(),
            "silence_min": round(dt / 60.0, 1), "last_lat": la0, "last_lon": lo0, "last_sog": sog0, "last_cog": cog0,
            "dr_lat": float(dr_lat), "dr_lon": float(dr_lon), "radius_nm": round(r_nm, 1),
            "bbox": [float(lo0 - dlon), float(la0 - dlat), float(lo0 + dlon), float(la0 + dlat)],   # [W, S, E, N]
            "new_lat": lat, "new_lon": lon})

    def _result(self, mmsi, ts, lat, lon, sog, cog, status, score, flagged, ping, truth):
        return {"status": status, "mmsi": mmsi, "time": ts.isoformat(), "lat": lat, "lon": lon,
                "sog": sog, "cog": cog, "score": score, "flagged": bool(flagged),
                "truth": bool(truth), "truth_type": str(ping.get("true_type", "") or ""), "vconf": False}

    def _remember(self, res):
        self.vessels[res["mmsi"]] = res

    # --------------------------------------------------------------- read-outs
    def snapshot(self, n_alerts=20):
        with self.lock:
            scored = max(self.n_scored, 1)
            P, R = self.tp + self.fp, self.tp + self.fn
            vt = dict(self.vt)                           # finished trips + trips in progress that have enough evidence
            for st in self.state.values():
                if st["n_win"] >= self.MIN_EVAL:
                    vt[self._verdict_key(st)] += 1
            vP, vR = vt["tp"] + vt["fp"], vt["tp"] + vt["fn"]
            return {
                "n_pings": self.n_pings, "n_scored": self.n_scored, "n_alerts": self.n_alerts,
                "n_rejected": self.n_rejected, "n_vessels": len(self.vessels),
                "mean_latency_ms": self.lat_sum / scored, "threshold": self.threshold,
                "vessels": list(self.vessels.values()),
                "alerts": list(self.alerts)[-n_alerts:][::-1],
                "recent_scores": list(self.recent),
                "tp": self.tp, "fp": self.fp, "tn": self.tn, "fn": self.fn,
                "live_precision": (self.tp / P) if P else None,
                "live_recall": (self.tp / R) if R else None,
                "n_conf_now": sum(1 for st in self.state.values() if st["conf"]),
                "type_source": self.type_source, "type_counts": dict(self.type_counts), "n_detections": self.n_detections, "type_hits": self.type_hits, "type_total": self.type_total,
                "detections": list(self.vessel_log)[-n_alerts:][::-1],
                "blackouts": list(self.blackouts)[-n_alerts:][::-1], "n_blackouts": self.n_blackouts,
                "eez_on": self.eez is not None, "n_in_eez": sum(1 for st in self.state.values() if st.get("in_eez")),
                "n_eez_entries": self.n_eez_entries, "eez_events": list(self.eez_events)[-n_alerts:][::-1],
                "v_tp": vt["tp"], "v_fp": vt["fp"], "v_tn": vt["tn"], "v_fn": vt["fn"],
                "v_precision": (vt["tp"] / vP) if vP else None,
                "v_recall": (vt["tp"] / vR) if vR else None,
            }

    def alerts_geojson(self, limit=50):
        """RFC 7946 FeatureCollection (the alert format promised in the proposal, FR7).
        Features: confirmed anomalous vessels (Point), transponder-blackout search areas (Polygon, FR5),
        and the dead-reckoned position of each blackout (Point)."""
        snap = self.snapshot(limit)
        feats = []
        for d in snap["detections"]:
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [d["lon"], d["lat"]]},
                "properties": {"kind": "vessel_anomaly", "mmsi": d["mmsi"], "time": d["time"],
                               "anomaly_type": d["type"], "anomaly_score": round(float(d["score"]), 4),
                               "windows_flagged": d["n_flagged"], "windows_checked": d["n_windows"],
                               "inside_eez": d.get("in_eez"), "threshold": self.threshold}})
        for b in snap["blackouts"]:
            la0, lo0, r = b["last_lat"], b["last_lon"], b["radius_nm"]
            coslat = max(np.cos(np.radians(la0)), 0.05)
            ring = [[round(lo0 + (r / (60.0 * coslat)) * np.sin(a), 5), round(la0 + (r / 60.0) * np.cos(a), 5)]
                    for a in np.linspace(0, 2 * np.pi, 49)]
            ring[-1] = ring[0]
            feats.append({
                "type": "Feature", "bbox": b["bbox"],
                "geometry": {"type": "Polygon", "coordinates": [ring]},
                "properties": {"kind": "blackout_search_area", "mmsi": b["mmsi"], "last_seen": b["last_seen"],
                               "reappeared": b["reappeared"], "silence_min": b["silence_min"],
                               "radius_nm": r, "last_sog": b["last_sog"], "last_cog": b["last_cog"]}})
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(b["dr_lon"], 5), round(b["dr_lat"], 5)]},
                "properties": {"kind": "dead_reckoned_position", "mmsi": b["mmsi"], "silence_min": b["silence_min"]}})
        for e in snap.get("eez_events", []):
            feats.append({
                "type": "Feature", "geometry": {"type": "Point", "coordinates": [e["lon"], e["lat"]]},
                "properties": {"kind": "eez_entry", "mmsi": e["mmsi"], "time": e["time"]}})
        return {"type": "FeatureCollection", "features": feats}