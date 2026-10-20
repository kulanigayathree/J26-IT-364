"""C1 LIVE dashboard (Streamlit). Pings flow in one by one -> engine scores them -> map/alerts update by themselves.

Run (from the repo root):   streamlit run models\\C1_vessel_anomaly\\live_dashboard.py

HONEST LABEL: the feed is a SIMULATED live feed = replay of recorded GFW tracks (international data)
with synthetic anomalies injected into held-out vessels. It is not Sri Lankan data and not a real receiver.
"""
import os
import sys
import time
from pathlib import Path

import pydeck as pdk
import pandas as pd
import streamlit as st

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from stream_engine import StreamEngine  # noqa: E402
from replay import replay  # noqa: E402

RES = Path(os.environ.get("C1_RESULTS", HERE / "results_c1"))
CSV = os.environ.get("C1_TRAIN_CSV", str(HERE.parent.parent / "data" / "raw" / "trawlers_small.csv"))

st.set_page_config(page_title="C1 Live Monitor", layout="wide")
st.title("C1 - Vessel Behaviour Anomaly Monitor (live)")
st.warning("SIMULATED LIVE FEED: replay of recorded tracks (GFW, international) with synthetic anomalies "
           "injected. Not real-time Sri Lankan AIS.")


def rerun():
    (getattr(st, "rerun", None) or st.experimental_rerun)()


def get_engine():
    return StreamEngine(RES, csv_path=CSV)


if hasattr(st, "cache_resource"):
    get_engine = st.cache_resource(get_engine)
else:
    get_engine = st.cache(allow_output_mutation=True, suppress_st_warning=True)(get_engine)


try:
    eng = get_engine()
except SystemExit as ex:
    st.error(str(ex))
    st.stop()
except Exception as ex:                                   # noqa: BLE001
    st.error("Could not load the trained model from %s : %s\nRun run_c1.py first." % (RES, ex))
    st.stop()

ss = st.session_state
if "gen" not in ss:                                       # a brand-new browser session: start from zero
    ss.gen, ss.running = None, False
    eng.reset()

st.sidebar.header("Controls")
speed = st.sidebar.slider("Pings per second", 1, 100, 20)
thr = st.sidebar.slider("Alert threshold", 0.0, 1.0, float(eng.threshold), 0.01)
eng.set_threshold(thr)
c1, c2, c3 = st.sidebar.columns(3)
if c1.button("Start"):
    if ss.gen is None:
        ss.gen = replay(RES / "test_tracks.csv")
    ss.running = True
if c2.button("Pause"):
    ss.running = False
if c3.button("Reset"):
    eng.reset()
    ss.gen, ss.running = None, False
    rerun()

status_ph = st.empty()
kpi_ph = st.empty()
st.subheader("Map  (green = normal, red = anomaly alert)")
map_ph = st.empty()
st.subheader("Latest alerts")
alert_ph = st.empty()
st.subheader("Anomaly score of the latest windows (higher = more unusual)")
chart_ph = st.empty()
note_ph = st.empty()


def render():
    s = eng.snapshot()
    with kpi_ph.container():
        m = st.columns(5)
        m[0].metric("Pings received", s["n_pings"])
        m[1].metric("Vessels tracked", s["n_vessels"])
        m[2].metric("Alerts raised", s["n_alerts"])
        m[3].metric("Avg scoring time", "%.1f ms" % s["mean_latency_ms"])
        m[4].metric("Status", "RUNNING" if ss.running else ("READY (press Start)" if s["n_pings"] == 0 else "PAUSED"))
    vs = pd.DataFrame(s["vessels"])
    if len(vs):
        if "view" not in ss:                       # fix the camera once, so the map does not jump around
            ss.view = (float(vs["lat"].mean()), float(vs["lon"].mean()))
        vs = vs.copy()
        vs["color"] = vs["flagged"].map(lambda f: [220, 30, 30, 230] if f else [20, 150, 60, 200])
        vs["radius"] = vs["flagged"].map(lambda f: 90000 if f else 50000)
        vs["Vessel (MMSI)"] = vs["mmsi"].astype(str)
        vs["Score"] = vs["score"].map(lambda x: "warming up" if x is None else "%.2f" % x)
        vs = vs[["lon", "lat", "color", "radius", "Vessel (MMSI)", "Score"]]   # only clean columns (NaN breaks the map's JSON)
        layer = pdk.Layer("ScatterplotLayer", vs, get_position="[lon, lat]", get_fill_color="color",
                          get_radius="radius", radius_min_pixels=4, radius_max_pixels=14, pickable=True)
        view = pdk.ViewState(latitude=ss.view[0], longitude=ss.view[1], zoom=2.5)
        map_ph.pydeck_chart(pdk.Deck(layers=[layer], initial_view_state=view,
                                     tooltip={"text": "Vessel {Vessel (MMSI)}\nScore {Score}"}))
    else:
        map_ph.info("Press Start in the sidebar.")
    if s["alerts"]:
        a = pd.DataFrame(s["alerts"])
        t = pd.DataFrame({
            "Time (UTC)": a["time"].astype(str).str.slice(0, 16).str.replace("T", " "),
            "Vessel (MMSI)": a["mmsi"].astype(str),
            "Anomaly score": a["score"].round(2),
            "Speed (knots)": a["sog"].round(1),
            "Latitude": a["lat"].round(3),
            "Longitude": a["lon"].round(3),
        }).head(12).set_index("Time (UTC)")
        alert_ph.table(t)
    else:
        alert_ph.write("No alerts yet.")
    if s["recent_scores"]:
        chart_ph.line_chart(pd.DataFrame({"score": s["recent_scores"]}))
    note_ph.caption(
        "Replay contains injected anomalies with known labels, so we can check: caught %s of the injected "
        "events; false alarms: %d of %d scored windows (per ping, overlapping windows)."
        % ("n/a" if s["live_recall"] is None else "%.0f%%" % (100 * s["live_recall"]), s["fp"], s["n_scored"]))


def step():
    for _ in range(speed):
        try:
            eng.process(next(ss.gen))
        except StopIteration:
            ss.running = False
            status_ph.success("Replay finished.")
            return


render()
while ss.running and ss.gen is not None:
    step()
    render()
    if not ss.running:
        break
    time.sleep(1.0)