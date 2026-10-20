"""C1 dashboard - shows the RESULTS of run_c1.py (offline replay of recorded AIS tracks).

Run from the repo root:
    streamlit run models/C1_vessel_anomaly/dashboard.py
Reads ./results_c1/ next to this file (override with env var C1_RESULTS).
Nothing here is live: the labels say so on purpose.
"""
import json
import os
from pathlib import Path

import folium
import numpy as np
import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

RES = Path(os.environ.get("C1_RESULTS", Path(__file__).resolve().parent / "results_c1"))

st.set_page_config(page_title="C1 Vessel Anomaly Detection", page_icon="⚓", layout="wide")


@st.cache_data
def load(res):
    res = Path(res)
    need = ["test_windows.csv", "test_tracks.csv", "run_info.json", "metrics.csv"]
    missing = [n for n in need if not (res / n).exists()]
    if missing:
        return None, missing
    win = pd.read_csv(res / "test_windows.csv")
    win["t_end"] = pd.to_datetime(win["t_end"], utc=True, errors="coerce")
    win["anomaly_type"] = win["anomaly_type"].fillna("none")
    trk = pd.read_csv(res / "test_tracks.csv")
    info = json.loads((res / "run_info.json").read_text())
    met = pd.read_csv(res / "metrics.csv")
    return (win, trk, info, met), []


data, missing = load(str(RES))
if data is None:
    st.error(f"No results found in {RES}\n\nMissing: {missing}\n\nRun first:  python run_c1.py --csv <your csv>")
    st.stop()
win, trk, info, met = data

# ---------------------------------------------------------------- header
st.title("⚓ C1 – Vessel Behaviour Anomaly Detection")
st.caption("Time-decay GRU autoencoder + transmission-gap analyzer  ·  Offline replay of recorded AIS tracks (not a live feed)")
if info.get("is_demo"):
    st.error("DEMO MODE: these are FAKE tracks that only test the software. Do not present these numbers.")
st.info(
    f"Source file: **{info['source_file']}**  ·  {info['n_pings']:,} pings, {info['n_vessels']:,} vessels  ·  "
    "The test vessels contain **synthetic anomalies injected on purpose** (GPS spoof, AIS gap, slowdown, zig-zag) "
    "so that ground truth exists to measure detection."
)

# ---------------------------------------------------------------- sidebar
default_thr = float(np.clip(info.get("full_engine_threshold", 0.5), 0.0, 1.0))
with st.sidebar:
    st.header("Controls")
    thr = st.slider("Alert threshold (anomaly score)", 0.0, 1.0, default_thr, 0.01,
                    help="Window is flagged when its score is at or above this. Default = value picked on the validation set.")
    mmsis = sorted(trk["mmsi"].unique().tolist())
    vessel = st.selectbox("Vessel (MMSI)", ["All vessels (sample)"] + [str(m) for m in mmsis])
    types = sorted(win["anomaly_type"].replace("", "none").unique().tolist())
    sel_types = st.multiselect("Show injected anomaly types", [t for t in types if t != "none"],
                               default=[t for t in types if t != "none"])
    show_fa = st.checkbox("Show false alarms", True)
    st.caption("Latency per window: %.2f ms (target < 500 ms) on %s" % (info["latency_ms_mean"], info["device"]))

# ---------------------------------------------------------------- live metrics at the chosen threshold
win = win.copy()
win["flag"] = (win["score_full"] >= thr).astype(int)
y, p = win["y_true"].to_numpy(), win["flag"].to_numpy()
tp = int(((p == 1) & (y == 1)).sum()); fp = int(((p == 1) & (y == 0)).sum())
tn = int(((p == 0) & (y == 0)).sum()); fn = int(((p == 0) & (y == 1)).sum())
prec = tp / (tp + fp) if tp + fp else 0.0
rec = tp / (tp + fn) if tp + fn else 0.0
f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
far = fp / (fp + tn) if fp + tn else 0.0

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Test windows", f"{len(win):,}")
c2.metric("Alerts raised", f"{int(p.sum()):,}")
c3.metric("Recall", f"{rec:.1%}")
c4.metric("Precision", f"{prec:.1%}")
c5.metric("False alarm rate", f"{far:.2%}", help="Proposal target: below 5%")
st.caption(f"F1 = {f1:.3f}  ·  TP {tp:,} · FP {fp:,} · FN {fn:,} · TN {tn:,}  ·  these numbers change with the threshold slider")

# ---------------------------------------------------------------- map
st.subheader("Map – tracks and alerts")
if vessel == "All vessels (sample)":
    t_map = trk[trk["track_id"].isin(trk["track_id"].drop_duplicates().iloc[:40])]
    w_map = win[win["track_id"].isin(t_map["track_id"].unique())]
else:
    t_map = trk[trk["mmsi"].astype(str) == vessel]
    w_map = win[win["mmsi"].astype(str) == vessel]

if len(t_map):
    m = folium.Map(location=[t_map["lat"].mean(), t_map["lon"].mean()], zoom_start=8, tiles="OpenStreetMap", prefer_canvas=True)
    for tid, g in t_map.groupby("track_id"):
        folium.PolyLine(g[["lat", "lon"]].values.tolist(), color="#2563eb", weight=1.5, opacity=0.5).add_to(m)
    shown = w_map[(w_map["flag"] == 1) | (w_map["y_true"] == 1)]
    shown = shown[(shown["anomaly_type"].isin(sel_types)) | (shown["y_true"] == 0)]
    if not show_fa:
        shown = shown[shown["y_true"] == 1]
    if len(shown) > 2000:
        shown = shown.sample(2000, random_state=0)
    for r in shown.itertuples():
        if r.flag == 1 and r.y_true == 1:
            col, lab = "#dc2626", "Detected"
        elif r.flag == 1:
            col, lab = "#f59e0b", "False alarm"
        else:
            col, lab = "#7c3aed", "Missed"
        folium.CircleMarker(
            [r.lat_end, r.lon_end], radius=5, color=col, fill=True, fill_opacity=0.85,
            tooltip=f"{lab} | MMSI {r.mmsi} | type: {r.anomaly_type or 'none'} | score {r.score_full:.2f}",
        ).add_to(m)
    try:
        st_folium(m, use_container_width=True, height=560, returned_objects=[])
    except TypeError:
        st_folium(m, width=1100, height=560, returned_objects=[])
    st.caption("🔴 detected injected anomaly   🟠 false alarm   🟣 missed anomaly   🔵 recorded track   ·   EEZ/MPA geofence layer: not implemented yet")
else:
    st.warning("No tracks to show for this selection.")

# ---------------------------------------------------------------- score timeline
if vessel != "All vessels (sample)":
    st.subheader(f"Anomaly score over time – MMSI {vessel}")
    tl = w_map.sort_values("t_end").set_index("t_end")[["score_full"]].rename(columns={"score_full": "anomaly score"})
    tl["threshold"] = thr
    st.line_chart(tl)

# ---------------------------------------------------------------- recall by type + model comparison
left, right = st.columns(2)
with left:
    st.subheader("Recall by injected anomaly type")
    pos = win[win["y_true"] == 1]
    if len(pos):
        by = pos.groupby("anomaly_type")["flag"].mean().rename("recall")
        st.bar_chart(by)
        st.caption("Per type, at the current threshold. 'gap' is caught by the rule layer (silence > 20 min).")
with right:
    st.subheader("Model comparison (test set)")
    cols = [c for c in ["model", "roc_auc", "pr_auc", "precision", "recall", "f1", "far"] if c in met.columns]
    st.dataframe(met[cols].round(3).set_index("model"))
    st.caption("Thresholds for each model were chosen on a separate validation set (FAR ≤ 5%), then applied to the test set.")

st.markdown("---")
st.caption("Still to do (proposal): EEZ/MPA geofence layer · EKF and TD-DBSCAN baselines · real Indian Ocean evaluation data · streaming throughput test.")
