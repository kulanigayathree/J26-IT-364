"""Vessel Behaviour Anomaly Detection - one app, four pages.

    Live Monitor | Model Performance | Sri Lankan EEZ | Data & Method

Run (repo root):     streamlit run models\\C1_vessel_anomaly\\app.py

It picks the trained model folder by itself: results_colab, else results_c1_v2, else results_c1
(or set the env var C1_RESULTS to a folder). Optional env vars: GFW_CSV, GFW_CSV2 (Sri Lankan events files).
"""
import html as htmllib
import json
import math
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import pydeck as pdk
import streamlit as st

try:
    import altair as alt
except Exception:                                           # noqa: BLE001
    alt = None

HERE = Path(__file__).resolve().parent
os.chdir(str(HERE.parent.parent))                           # repo root, so data\raw\... paths work
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

st.set_page_config(page_title="Vessel Anomaly Monitor", page_icon=None, layout="wide",
                   initial_sidebar_state="expanded")

# ----------------------------------------------------------------------------- look & feel
st.markdown("""
<style>
.block-container{padding-top:1.4rem;padding-bottom:2.5rem;max-width:1400px}
#MainMenu, footer{visibility:hidden}
h1{font-size:1.85rem !important;font-weight:700 !important;margin-bottom:.2rem !important}
h2, h3{font-weight:650 !important}
.kpi{border:1px solid rgba(128,128,128,.30);border-radius:12px;padding:13px 16px;
     background:rgba(128,128,128,.07);min-height:104px}
.kpi .l{font-size:.74rem;letter-spacing:.05em;text-transform:uppercase;opacity:.72;font-weight:650}
.kpi .v{font-size:1.85rem;font-weight:700;line-height:1.3}
.kpi .c{font-size:.76rem;opacity:.66;margin-top:1px}
.note{border-left:4px solid #e0a100;background:rgba(224,161,0,.10);padding:9px 14px;
      border-radius:6px;font-size:.88rem;margin:.2rem 0 .9rem 0}
.good{border-left-color:#2e9e5b;background:rgba(46,158,91,.10)}
.legend{font-size:.86rem;margin:.1rem 0 .5rem 0}
.legend span{margin-right:20px;white-space:nowrap}
.dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:middle}
.line{display:inline-block;width:18px;height:3px;margin-right:6px;vertical-align:middle;border-radius:2px}
.brand{font-size:1.15rem;font-weight:700;line-height:1.3}
.sub{opacity:.65;font-size:.82rem;margin:3px 0 14px 0}
.step{border:1px solid rgba(128,128,128,.30);border-radius:12px;padding:12px 14px;
      background:rgba(128,128,128,.06);min-height:128px;font-size:.88rem}
.step b{display:block;font-size:.95rem;margin-bottom:4px}
section[data-testid="stSidebar"] div[role="radiogroup"] label{padding:5px 2px;font-size:.98rem}
</style>
""", unsafe_allow_html=True)

GREEN, RED, GREY = [20, 150, 60, 235], [220, 30, 30, 215], [170, 170, 170, 130]
# one colour per kind of unusual behaviour (map dots, legend, report)
TYPE_RGB = {"Spoofing": (220, 30, 30), "Gap (AIS off)": (255, 140, 0), "Slowdown": (245, 200, 0),
            "Zigzag": (200, 40, 200), "Unusual behaviour": (150, 150, 150)}


def type_rgb(t):
    return TYPE_RGB.get(t, TYPE_RGB["Unusual behaviour"])


def type_hex(t):
    return "#%02x%02x%02x" % type_rgb(t)


def counts_of(s):
    """Doughnut data: engine's own counts, or counted from the confirmed-vessel list (works with any engine version)."""
    tc = s.get("type_counts")
    if not tc:
        tc = {}
        for d in s.get("detections", []):
            tc[d.get("type", "Unusual behaviour")] = tc.get(d.get("type", "Unusual behaviour"), 0) + 1
    return {k: v for k, v in tc.items() if v}


def fmt_time(t):
    return str(t)[:16].replace("T", " ")


def kpi(col, label, value, caption=""):
    col.markdown('<div class="kpi"><div class="l">%s</div><div class="v">%s</div><div class="c">%s</div></div>'
                 % (label, value, caption), unsafe_allow_html=True)


def note(text, good=False):
    st.markdown('<div class="note%s">%s</div>' % (" good" if good else "", text), unsafe_allow_html=True)


def title(page_name):
    st.title("Vessel Anomaly Detection | %s" % page_name)


def rerun():
    (getattr(st, "rerun", None) or st.experimental_rerun)()


def cached(fn):
    if hasattr(st, "cache_data"):
        return st.cache_data(show_spinner=False)(fn)
    return st.cache(allow_output_mutation=True, suppress_st_warning=True)(fn)


@cached
def load_eez_rings():
    """Outline of the Sri Lankan EEZ (data/raw/sri_lanka_eez.geojson), [] when the file is not there."""
    try:
        import geofence as gf
        g = gf.load_default(__file__)
        return g.rings() if g else []
    except Exception:                                       # noqa: BLE001
        return []


def pick_results():
    env = os.environ.get("C1_RESULTS")
    if env:
        return Path(env)
    for n in ("results_colab", "results_c1_v2", "results_c1"):
        if (HERE / n / "model.pt").exists():
            return HERE / n
    return HERE / "results_c1"


RES = pick_results()
CSV = os.environ.get("C1_TRAIN_CSV", os.path.join("data", "raw", "trawlers_small.csv"))
API = os.environ.get("C1_API", "http://localhost:8000")            # the scoring backend (api_server.py)
DEFAULT_SOURCE = os.environ.get("C1_SOURCE", "api")                # "api" = automatic backend, "replay" = built-in replay


class RemoteEngine:
    """Gives the Live page the same few methods as StreamEngine, but the numbers come from the backend over HTTP."""

    def __init__(self, base):
        self.base, self.threshold, self.trails, self.last, self.ok = base.rstrip("/"), 0.5, {}, None, True

    def snapshot(self, n_alerts=150):
        import requests
        try:
            s = requests.get(self.base + "/state", params={"n": n_alerts}, timeout=8).json()
            self.ok = True
        except Exception:                                                  # noqa: BLE001
            self.ok = False
            if self.last is None:
                raise
            return self.last
        self.trails = s.pop("trails", {})
        self.threshold = float(s.get("threshold", self.threshold))
        self.last = s
        return s

    def set_threshold(self, thr):
        import requests
        if abs(float(thr) - self.threshold) > 1e-9:
            try:
                requests.post(self.base + "/threshold", json={"value": float(thr)}, timeout=5)
                self.threshold = float(thr)
            except Exception:                                              # noqa: BLE001
                pass

    def reset(self):
        import requests
        try:
            requests.post(self.base + "/reset", timeout=5)
        except Exception:                                                  # noqa: BLE001
            pass
        self.last, self.trails = None, {}


def zoom_for(lat_span, lon_span):
    lat_span, lon_span = max(lat_span, 0.5), max(lon_span, 0.5)
    z = min(math.log(703.0 / (lon_span * 1.25), 2), math.log(365.0 / (lat_span * 1.25), 2))
    return float(min(max(z, 1.0), 9.0))


# ----------------------------------------------------------------------------- shared loaders
@cached
def load_preview(path_str, mtime):
    """Light grey 'recorded tracks' shown on the map before Start, and the camera that fits them."""
    df = pd.read_csv(path_str, usecols=["track_id", "lat", "lon"])
    k = max(1, len(df) // 8000)
    rows = []
    for _, g in df.groupby("track_id"):
        g = g.iloc[::k]
        if len(g) >= 2:
            rows.append({"path": [[round(float(a), 4), round(float(b), 4)] for a, b in zip(g["lon"], g["lat"])],
                         "label": "Recorded track"})
    lat0, lat1, lon0, lon1 = df["lat"].min(), df["lat"].max(), df["lon"].min(), df["lon"].max()
    view = (float((lat0 + lat1) / 2), float((lon0 + lon1) / 2), zoom_for(lat1 - lat0, lon1 - lon0))
    return rows, view


@cached
def load_results(res_str, mtime):
    res = Path(res_str)
    out = {}
    mc = res / "metrics.csv"
    out["metrics"] = pd.read_csv(mc) if mc.exists() else None
    tw = res / "test_windows.csv"
    out["windows"] = pd.read_csv(tw, usecols=["mmsi", "y_true", "anomaly_type", "score_ae"]) if tw.exists() else None
    ri = res / "run_info.json"
    out["info"] = json.load(open(str(ri))) if ri.exists() else {}
    return out


def nice_name(m):
    return (m.replace(" (proposed)", "").replace("full C1 engine", "full engine")
             .replace("TimeDecay-GRU-AE", "Time-decay GRU autoencoder"))


def add_scores(m):
    m = m.copy()
    tot = m["tp"] + m["fp"] + m["tn"] + m["fn"]
    m["accuracy"] = (m["tp"] + m["tn"]) / tot
    m["model_name"] = m["model"].map(nice_name)
    return m



# ----------------------------------------------------------------------------- downloadable report
WORLD_OUTLINE_B64 = (
    "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"
    "CJ"
)


def world_geojson():
    """Low-resolution land outlines (Natural Earth, public domain), stored inside this file so the report map
    works without any online map service."""
    import base64
    import zlib
    rings = json.loads(zlib.decompress(base64.b64decode("".join(WORLD_OUTLINE_B64))).decode())
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [r]}} for r in rings]}


def svg_scores(scores, thr, w=820, h=270):
    """Offline-safe line chart (no libraries): recent anomaly scores + threshold line."""
    if not scores:
        return "<p>No scores yet.</p>"
    ml, mr, mt, mb = 52, 16, 12, 34
    pw, ph = w - ml - mr, h - mt - mb
    n = len(scores)
    pts = " ".join("%.1f,%.1f" % (ml + pw * i / max(n - 1, 1), mt + ph * (1 - min(max(v, 0.0), 1.0)))
                   for i, v in enumerate(scores))
    grid = ""
    for g in (0, 0.25, 0.5, 0.75, 1.0):
        y = mt + ph * (1 - g)
        grid += ('<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#ddd"/>'
                 '<text x="%d" y="%.1f" font-size="11" text-anchor="end" fill="#555">%.2f</text>') % (ml, y, w - mr, y, ml - 6, y + 4, g)
    ty = mt + ph * (1 - thr)
    return ('<svg viewBox="0 0 %d %d" width="100%%" style="max-width:%dpx;font-family:Arial,sans-serif">%s'
            '<polyline fill="none" stroke="#2a6fb0" stroke-width="1.6" points="%s"/>'
            '<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#d62728" stroke-dasharray="6,4" stroke-width="1.6"/>'
            '<text x="%d" y="%.1f" font-size="11" text-anchor="end" fill="#d62728">alert threshold %.2f</text>'
            '<text x="%d" y="%d" font-size="11" text-anchor="middle" fill="#555">latest windows (older to newer)</text>'
            '<text x="14" y="%d" font-size="11" fill="#555" transform="rotate(-90 14 %d)" text-anchor="middle">anomaly score</text></svg>'
            ) % (w, h, w, grid, pts, ml, ty, w - mr, ty, w - mr, ty - 5, thr, ml + pw // 2, h - 6, mt + ph // 2, mt + ph // 2)


def build_report(s, eng_threshold, trails, paths, view0, model_name):
    """One self-contained HTML file: summary, map, alerts table, score chart. Open it in a browser; Ctrl+P saves a PDF."""
    esc = htmllib.escape
    tot = s["v_tp"] + s["v_fp"] + s["v_tn"] + s["v_fn"]
    acc = "%.1f%%" % (100.0 * (s["v_tp"] + s["v_tn"]) / tot) if tot else "-"
    prec = "%.0f%%" % (100 * s["v_precision"]) if s["v_precision"] is not None else "-"
    rec = "%.0f%%" % (100 * s["v_recall"]) if s["v_recall"] is not None else "-"
    cards = "".join('<div class="k"><div class="l">%s</div><div class="v">%s</div></div>' % (a, b) for a, b in [
        ("Position reports", "{:,}".format(s["n_pings"])), ("Vessels tracked", "{:,}".format(s["n_vessels"])),
        ("Anomalous vessels", "{:,}".format(s["n_conf_now"])), ("Scoring time", "%.1f ms" % s["mean_latency_ms"]),
        ("Accuracy", acc), ("Precision", prec), ("Recall", rec), ("False alarms", "{:,}".format(s["v_fp"]))])

    try:
        import folium
        lat0, lon0, zoom = view0
        m = folium.Map(location=[lat0, lon0], zoom_start=max(1, int(round(zoom))), tiles=None)
        m.get_root().header.add_child(folium.Element("<style>.leaflet-container{background:#cfe0ee !important}</style>"))
        folium.GeoJson(world_geojson(), name="Land outline (built in, works offline)",
                       style_function=lambda f: {"fillColor": "#f3efe6", "color": "#9aa7b3", "weight": 0.8,
                                                 "fillOpacity": 1}).add_to(m)
        for nm, url in (("Esri Ocean (online)", "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"),
                        ("Esri Satellite (online)", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")):
            folium.TileLayer(url, attr="Tiles &copy; Esri", name=nm, overlay=False, show=False).add_to(m)
        for p in (paths or [])[:300]:
            folium.PolyLine([[b, a] for a, b in p["path"]], color="#999999", weight=1, opacity=0.6).add_to(m)
        for mm, p in trails.items():
            if len(p) >= 2:
                folium.PolyLine([[b, a] for a, b in p], color="#149640", weight=2, opacity=0.8).add_to(m)
        for v in s["vessels"]:
            if not v.get("vconf"):
                folium.CircleMarker([float(v["lat"]), float(v["lon"])], radius=4, color="#149640", fill=True,
                                    fill_opacity=0.9, tooltip="Vessel %s (normal)" % v["mmsi"],
                                    popup=folium.Popup("<b>Vessel %s</b> - normal<br>Position: %.4f N, %.4f E<br>Speed: %.1f knots<br>Time (UTC): %s" % (
                                        v["mmsi"], float(v["lat"]), float(v["lon"]), float(v["sog"]), fmt_time(v["time"])),
                                        max_width=260)).add_to(m)
        for a in s["detections"]:
            col = type_hex(a.get("type", ""))
            folium.CircleMarker([float(a["lat"]), float(a["lon"])], radius=7, color="#ffffff", weight=1, fill=True,
                                fill_color=col, fill_opacity=0.95,
                                tooltip="ANOMALOUS VESSEL %s - %s" % (a["mmsi"], a.get("type", "")),
                                popup=folium.Popup(
                                    "<b>ANOMALOUS VESSEL %s</b><br>Type: <b>%s</b><br>Position: %.4f N, %.4f E<br>Speed: %.1f knots<br>"
                                    "Time (UTC): %s<br>Evidence: %d of %d recent windows flagged" % (
                                        a["mmsi"], a.get("type", ""), float(a["lat"]), float(a["lon"]), float(a["sog"]),
                                        fmt_time(a["time"]), a["n_flagged"], a["n_windows"]), max_width=280)).add_to(m)
        folium.LayerControl(collapsed=True).add_to(m)
        map_html = ('<iframe style="width:100%%;height:520px;border:1px solid #ccc;border-radius:8px" srcdoc="%s"></iframe>'
                    '<p class="small">Green = normal vessel; other colours = vessel confirmed as anomalous, by type (red spoofing, orange gap, yellow slowdown, magenta zigzag, grey other); click a dot for its exact position and details; thin green line = recent movement, grey = '
                    'recorded tracks. The background is a simple built-in land outline (low resolution) that works offline; the layer button at the top right of the map can switch on online map backgrounds.</p>'
                    % htmllib.escape(m.get_root().render(), quote=True))
    except Exception as ex:                                     # noqa: BLE001
        map_html = "<p>Map not available (%s). Alert coordinates are in the table below.</p>" % esc(str(ex))

    if s["detections"]:
        rows = "".join("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%d of %d</td><td>%.2f</td><td>%.1f</td><td>%.3f</td><td>%.3f</td></tr>" % (
            esc(str(a["time"])[:16].replace("T", " ")), esc(str(a["mmsi"])), esc(a.get("type", "")),
            esc(a.get("true_type", "") or "-"), a["n_flagged"], a["n_windows"],
            a["score"], a["sog"], a["lat"], a["lon"]) for a in s["detections"])
        table = ('<table><tr><th>Time (UTC)</th><th>Vessel (MMSI)</th><th>Likely type</th><th>Injected type</th>'
                 '<th>Windows flagged</th><th>Peak score</th>'
                 '<th>Speed (knots)</th><th>Latitude</th><th>Longitude</th></tr>%s</table>' % rows)
    else:
        table = "<p>No vessel was confirmed as anomalous.</p>"

    tc = counts_of(s)
    if tc:
        order = [k for k in TYPE_RGB if k in tc]
        total = float(sum(tc[k] for k in order))
        acc_, stops = 0.0, []
        for k in order:
            a0, a1 = 100 * acc_ / total, 100 * (acc_ + tc[k]) / total
            stops.append("%s %.2f%% %.2f%%" % (type_hex(k), a0, a1))
            acc_ += tc[k]
        leg = "".join('<div style="margin:5px 0"><span style="display:inline-block;width:11px;height:11px;border-radius:50%%;background:%s;margin-right:7px"></span><b>%s</b> - %d (%.0f%%)</div>' % (
            type_hex(k), esc(k), tc[k], 100 * tc[k] / total) for k in order)
        types_html = ('<div style="display:flex;align-items:center;gap:36px;flex-wrap:wrap">'
                      '<div style="width:190px;height:190px;border-radius:50%%;background:conic-gradient(%s);position:relative">'
                      '<div style="position:absolute;inset:44px;border-radius:50%%;background:#fff;display:flex;align-items:center;justify-content:center;'
                      'font-size:1.5rem;font-weight:700">%d</div></div><div>%s</div></div>' % (", ".join(stops), int(total), leg))
    else:
        types_html = "<p>No anomalous vessel was confirmed.</p>"

    return """<!doctype html><html><head><meta charset="utf-8"><title>Vessel Anomaly Detection - report</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;max-width:1000px;margin:24px auto;padding:0 16px;color:#222}
h1{font-size:1.6rem;margin-bottom:2px} h2{font-size:1.15rem;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:4px}
.meta{color:#666;font-size:.88rem} .note{border-left:4px solid #e0a100;background:#fdf6e3;padding:8px 12px;font-size:.88rem;margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.k{border:1px solid #ddd;border-radius:10px;padding:10px 12px;background:#fafafa}
.l{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#666}.v{font-size:1.5rem;font-weight:700}
table{border-collapse:collapse;width:100%%;font-size:.86rem}th,td{border:1px solid #ddd;padding:5px 8px;text-align:right}th{background:#f1f1f1}
td:first-child,th:first-child,td:nth-child(2),th:nth-child(2),td:nth-child(3),th:nth-child(3),td:nth-child(4),th:nth-child(4){text-align:left}.small{font-size:.8rem;color:#666}
@media print{.noprint{display:none}}
</style></head><body>
<h1>Vessel Anomaly Detection | Live Monitor report</h1>
<div class="meta">Generated %s | model: %s | alert threshold: %.2f | Sri Lankan EEZ project, IT23135352 (J26-IT-364)</div>
<div class="note"><b>Simulated feed.</b> Recorded international vessel tracks (Global Fishing Watch) were replayed ping by ping as if
live, with synthetic anomalies injected into vessels the model never saw in training. This is <b>not</b> real-time Sri Lankan AIS,
and the accuracy figures below measure detection of injected behaviour on a short sample.</div>
<h2>Summary</h2><div class="grid">%s</div>
<h2>Map</h2>%s
<h2>Anomalous vessels (confirmed)</h2>%s
<h2>Kinds of unusual behaviour found</h2>%s
<h2>Anomaly score of the latest windows</h2>%s
<p class="small noprint">To save as PDF: press Ctrl+P in your browser and choose "Save as PDF".</p>
</body></html>""" % (datetime.now().strftime("%Y-%m-%d %H:%M"), esc(model_name), float(eng_threshold), cards, map_html, table, types_html,
                      svg_scores(s["recent_scores"], float(eng_threshold)))


# ----------------------------------------------------------------------------- PAGE 1: live monitor
def page_live(box):
    from replay import replay

    title("Live Monitor")
    source = box.radio("Data source", ["Backend (automatic)", "Built-in replay (press Start)"],
                       index=0 if DEFAULT_SOURCE == "api" else 1, key="live_source")
    api_mode = source.startswith("Backend")
    if api_mode:
        st.caption("Automatic mode: an AIS feeder sends position reports to the scoring backend, and this page shows what the "
                   "backend finds - nothing to press. The demo feeder replays recorded tracks; in real use the navy's AIS receiver "
                   "would send the same messages. Not real-time Sri Lankan AIS (details at the bottom of the menu).")
    else:
        st.caption("Simulated replay of recorded tracks - not real-time Sri Lankan AIS (details at the bottom of the menu).")

    tracks_path = RES / "test_tracks.csv"
    if not tracks_path.exists() and not api_mode:
        st.error("Missing %s. Train first (run_c1.py)." % tracks_path)
        return

    if api_mode:
        eng = RemoteEngine(API)
        try:
            eng.snapshot(5)
        except Exception:                                    # noqa: BLE001
            st.error("The scoring backend is not reachable at %s.\n\nStart the whole system with start_system.bat "
                     "(or run: python -m uvicorn api_server:app --port 8000, and python auto_feed.py), then reload this page. "
                     "Or choose 'Built-in replay' in the sidebar." % API)
            return
    else:
        def make_engine():
            from stream_engine import StreamEngine          # imported only here: it loads torch (big), the automatic mode does not need it
            return StreamEngine(RES, csv_path=CSV)
        if hasattr(st, "cache_resource"):
            get_engine = st.cache_resource(make_engine)
        else:
            get_engine = st.cache(allow_output_mutation=True, suppress_st_warning=True)(make_engine)
        try:
            eng = get_engine()
        except SystemExit as ex:
            st.error(str(ex))
            return
        except Exception as ex:                              # noqa: BLE001
            st.error("Could not load the trained model from %s : %s" % (RES, ex))
            return

    ss = st.session_state
    init_key = "live_init_api" if api_mode else "live_init"
    if init_key not in ss:                                   # a brand-new browser session starts from zero
        ss[init_key] = True
        if api_mode:
            ss.gen, ss.running, ss.trails = "api", True, {}  # the backend is already running; just watch it
        else:
            ss.gen, ss.running, ss.trails = None, False, {}
            eng.reset()
    if api_mode:
        ss.gen, ss.running = "api", True
    elif ss.get("gen") == "api":                             # came back from automatic mode
        ss.gen, ss.running, ss.trails = None, False, {}
        eng.reset()

    box.markdown("**Simulation controls**")
    if api_mode:
        box.caption("Running automatically. The feeder sends about 20 pings per second and starts again when the data ends.")
        if box.button("Reset counters"):
            eng.reset()
            ss.trails = {}
            rerun()
        speed = 0
    else:
        c = box.columns(3)
        if c[0].button("Start"):
            if ss.gen is None:
                ss.gen = replay(tracks_path)
            ss.running = True
        if c[1].button("Pause"):
            ss.running = False
        if c[2].button("Reset"):
            eng.reset()
            ss.gen, ss.running, ss.trails = None, False, {}
            rerun()
        speed = box.slider("Pings per second", 1, 100, 20)
    thr = box.slider("Alert threshold", 0.0, 1.0, float(eng.threshold), 0.01,
                     help="A window gives a warning signal when its score is at or above this value. A vessel is only called anomalous when many of its recent windows do.")
    eng.set_threshold(thr)

    paths, view0 = [], (20.0, 10.0, 1.2)
    if tracks_path.exists() and not (api_mode and os.environ.get("C1_VIEW") == "world"):
        try:
            paths, view0 = load_preview(str(tracks_path), tracks_path.stat().st_mtime)
        except Exception:                                    # noqa: BLE001  (e.g. low memory): the map still works without the grey tracks
            paths, view0 = [], (20.0, 10.0, 1.2)
    else:                                                    # live world-wide feed: no recorded tracks, whole-world camera
        paths, view0 = [], (20.0, 10.0, 1.2)
    box.markdown("**Report**")
    if box.button("Create report"):
        snap = eng.snapshot(n_alerts=150)
        if snap["n_pings"] == 0:
            ss.report, ss.report_msg = None, "Run the simulation first (press Start), then create the report."
        else:
            ss.report = build_report(snap, eng.threshold, ss.trails, paths, view0, RES.name)
            ss.report_msg = "Report ready (%s pings, %s anomalous vessels)." % ("{:,}".format(snap["n_pings"]), "{:,}".format(snap["n_conf_now"]))
            ss.report_name = "vessel_anomaly_report_%s.html" % datetime.now().strftime("%Y%m%d_%H%M")
    if ss.get("report_msg"):
        box.caption(ss.report_msg)
    if ss.get("report"):
        box.download_button("Download report (HTML)", ss.report, file_name=ss.get("report_name", "report.html"),
                            mime="text/html")
    kpi_ph = st.empty()
    legend = ('<div class="legend"><span><i class="dot" style="background:rgb(20,150,60)"></i>Normal vessel</span>'
              + "".join('<span><i class="dot" style="background:%s"></i>%s</span>' % (
                  type_hex(k), k if k != "Unusual behaviour" else "Other unusual") for k in TYPE_RGB)
              + '<span><i class="line" style="background:rgb(20,150,60)"></i>Recent movement</span>'
              '<span><i class="line" style="background:#999"></i>Recorded tracks (area covered by the replay)</span>'
              '</div>')
    st.markdown(legend, unsafe_allow_html=True)
    map_ph = st.empty()
    st.subheader("Detect Anomaly Events")
    alert_ph = st.empty()
    st.subheader("Kinds of unusual behaviour found")
    type_ph = st.empty()
    st.subheader("Anomaly score of the latest windows")
    chart_ph = st.empty()
    st.subheader("Live accuracy check")
    acc_ph = st.empty()
    note_ph = st.empty()
    with st.expander("How are these numbers measured? What do they mean?"):
        st.markdown(
            "- **Position reports** - AIS messages processed so far (one message = one ping from one vessel).\n"
            "- **Vessels tracked** - different ships (MMSI) seen so far.\n"
            "- **Anomalous vessels** - vessels the system has *confirmed* as behaving abnormally. One high score is only a "
            "warning signal and can be a false alarm, so a vessel is judged on its whole recent trip: it is called anomalous "
            "only when at least 15% of its last 60 windows are over the threshold (a normal vessel is over it at most about 5% "
            "of the time) and at least 6 windows are over it. A *window* is the last 10 pings of one vessel.\n"
            "- **Likely type** - the kind of unusual behaviour (spoofing, gap, slowdown, zigzag). The neural network only says "
            "*unusual*; a separate classifier, trained on the injected (synthetic) anomalies, names the pattern. "
            "*Injected type (truth)* is what we actually injected, so the naming can be checked.\n"
            "- **Scoring time** - average time the model needs to score one window.\n"
            "- **Live accuracy check** - the replay contains anomalies we injected ourselves, so every alert can be "
            "compared with the truth, trip by trip. Precision = of the vessels called anomalous, how many really were; "
            "recall = of the really anomalous trips, how many were caught; accuracy = share of trips judged correctly. These live figures come from a "
            "short sample, so they differ from the full test-set results on the *Model Performance* page. "
            "The anomalies are synthetic, so this measures detection of injected behaviour, not real incidents.")

    def render():
        s = eng.snapshot(n_alerts=150)
        if api_mode:
            ss.trails = eng.trails
        with kpi_ph.container():
            k = st.columns(5)
            kpi(k[0], "Position reports", "{:,}".format(s["n_pings"]), "AIS messages processed")
            kpi(k[1], "Vessels tracked", "{:,}".format(s["n_vessels"]), "different ships seen")
            kpi(k[2], "Anomalous vessels", "{:,}".format(s["n_conf_now"]), "confirmed, of %d tracked" % s["n_vessels"])
            kpi(k[3], "Scoring time", "%.1f ms" % s["mean_latency_ms"], "average per window")
            status = "Running" if ss.running else ("Ready" if s["n_pings"] == 0 else "Paused")
            kpi(k[4], "Status", status if not api_mode else ("Running" if eng.ok else "Waiting"),
                "receiving from the backend" if api_mode else "%d pings / second" % speed if ss.running else
                ("press Start" if s["n_pings"] == 0 else "press Start to resume"))

        layers = []
        grey = pd.DataFrame(paths) if paths else None
        if grey is not None:
            layers.append(pdk.Layer("PathLayer", grey, get_path="path", get_color=GREY, width_min_pixels=1,
                                    get_width=1, pickable=False))
        eez_rings = load_eez_rings()
        if eez_rings:
            layers.append(pdk.Layer("PathLayer", pd.DataFrame({"path": eez_rings}), get_path="path",
                                    get_color=[0, 110, 200, 230], width_min_pixels=2, get_width=1, pickable=False))
        lat0, lon0, zoom = view0
        if ss.trails:
            tr = pd.DataFrame([{"path": p, "label": "Vessel %s" % m} for m, p in ss.trails.items() if len(p) >= 2])
            if len(tr):
                layers.append(pdk.Layer("PathLayer", tr, get_path="path", get_color=[20, 150, 60, 150],
                                        width_min_pixels=2, get_width=1, pickable=False))
        vs = pd.DataFrame(s["vessels"])
        if len(vs):
            ok = vs[~vs["vconf"].astype(bool)]
            if len(ok):
                d = pd.DataFrame({"lon": ok["lon"].astype(float), "lat": ok["lat"].astype(float),
                                  "label": ["Vessel %s - normal\nPosition: %.4f N, %.4f E\nSpeed: %.1f knots\nTime (UTC): %s" % (
                                      m, la, lo, sp, fmt_time(t)) for m, la, lo, sp, t in zip(
                                          ok["mmsi"], ok["lat"], ok["lon"], ok["sog"], ok["time"])]})
                layers.append(pdk.Layer("ScatterplotLayer", d, get_position="[lon, lat]", get_fill_color=GREEN,
                                        get_radius=40000, radius_min_pixels=4, radius_max_pixels=9, pickable=True))
        bl = s.get("blackouts") or []
        if bl:                                   # dead-reckoning search areas of transponder blackouts (> 20 min)
            b = pd.DataFrame(bl)
            bd = pd.DataFrame({"lon": b["last_lon"].astype(float), "lat": b["last_lat"].astype(float),
                               "radius_m": b["radius_nm"].astype(float) * 1852.0,
                               "label": ["TRANSPONDER BLACKOUT - vessel %s\nSilent for %.0f min\nLast seen: %.4f N, %.4f E\n"
                                         "Search area radius: %.1f nm (for satellite SAR)" % (
                                             m, mn, la, lo, r) for m, mn, la, lo, r in zip(
                                                 b["mmsi"], b["silence_min"], b["last_lat"], b["last_lon"], b["radius_nm"])]})
            layers.append(pdk.Layer("ScatterplotLayer", bd, get_position="[lon, lat]", get_radius="radius_m",
                                    filled=True, stroked=True, get_fill_color=[230, 120, 0, 28],
                                    get_line_color=[230, 120, 0, 220], line_width_min_pixels=2, pickable=True))
        if s["detections"]:
            a = pd.DataFrame(s["detections"])
            d = pd.DataFrame({"lon": a["lon"].astype(float), "lat": a["lat"].astype(float),
                              "color": [list(type_rgb(k)) + [225] for k in a["type"]],
                              "label": ["ANOMALOUS VESSEL %s\nType: %s\nPosition: %.4f N, %.4f E\nSpeed: %.1f knots\n"
                                        "Time (UTC): %s\nEvidence: %d of %d recent windows flagged" % (
                                            m, k, la, lo, sp, fmt_time(t), f, n) for m, k, la, lo, sp, t, f, n in zip(
                                                a["mmsi"], a["type"], a["lat"], a["lon"], a["sog"], a["time"],
                                                a["n_flagged"], a["n_windows"])]})
            layers.append(pdk.Layer("ScatterplotLayer", d, get_position="[lon, lat]", get_fill_color="color",
                                    get_radius=70000, radius_min_pixels=5, radius_max_pixels=12, stroked=True,
                                    get_line_color=[255, 255, 255, 255], line_width_min_pixels=1, pickable=True))
        deck = pdk.Deck(layers=layers, initial_view_state=pdk.ViewState(latitude=lat0, longitude=lon0, zoom=zoom),
                        tooltip={"text": "{label}"})
        try:
            map_ph.pydeck_chart(deck, height=540)
        except TypeError:
            map_ph.pydeck_chart(deck)
        bl_note = ""
        if s.get("eez_on"):
            bl_note += " Blue line: Sri Lankan EEZ border. Vessels inside it now: %d. Entries so far: %d." % (
                s.get("n_in_eez", 0), s.get("n_eez_entries", 0))
        if bl:
            bl_note += " Orange circles: transponder blackouts (silent > 20 min). Each circle is the area a vessel could " \
                            "have reached (15 knots x silence) - the search box handed to satellite SAR. %d blackouts so far." % s.get("n_blackouts", len(bl))

        if s["detections"]:
            a = pd.DataFrame(s["detections"])
            t = pd.DataFrame({
                "Time (UTC)": a["time"].astype(str).str.slice(0, 16).str.replace("T", " "),
                "Vessel (MMSI)": a["mmsi"].astype(str),
                "Likely type": a["type"],
                "Injected type (truth)": a["true_type"].map(lambda x: x or "-"),
                "Windows flagged": ["%d of %d" % (f, n) for f, n in zip(a["n_flagged"], a["n_windows"])],
                "Peak score": a["score"].map(lambda x: "%.2f" % x),
                "Speed (knots)": a["sog"].map(lambda x: "%.1f" % x),
                "Latitude": a["lat"].map(lambda x: "%.3f" % x),
                "Longitude": a["lon"].map(lambda x: "%.3f" % x),
            }).head(12).set_index("Time (UTC)")
            with alert_ph.container():
                st.table(t)
                if s.get("type_total"):
                    st.caption("Type named by the %s. Named correctly for %d of %d confirmed vessels (%.0f%%) - "
                               "the replay knows which anomaly type was injected." % (
                                   s.get("type_source", "rules"), s["type_hits"], s["type_total"], 100.0 * s["type_hits"] / s["type_total"]))
                else:
                    st.caption("Type named by the %s." % s.get("type_source", "rules"))
                if bl_note:
                    st.caption(bl_note.strip())
        else:
            alert_ph.caption("No vessel has been confirmed as anomalous yet." + bl_note)
        tc = counts_of(s)
        if tc:
            order = [k for k in TYPE_RGB if k in tc]
            td = pd.DataFrame({"type": order, "vessels": [tc[k] for k in order]})
            td["share"] = td["vessels"] / td["vessels"].sum()
            with type_ph.container():
                cc = st.columns([1, 1])
                if alt is not None:
                    ch = alt.Chart(td).mark_arc(innerRadius=70, outerRadius=130).encode(
                        theta=alt.Theta("vessels:Q"),
                        color=alt.Color("type:N", legend=None,
                                        scale=alt.Scale(domain=order, range=[type_hex(k) for k in order])),
                        tooltip=["type", "vessels", alt.Tooltip("share:Q", format=".0%")])
                    cc[0].altair_chart(ch.properties(height=290), use_container_width=True)
                else:
                    cc[0].bar_chart(td.set_index("type")["vessels"])
                lines = "".join('<div style="margin:.35rem 0"><i class="dot" style="background:%s"></i><b>%s</b> - %d vessel%s (%.0f%%)</div>' % (
                    type_hex(r["type"]), r["type"], r["vessels"], "" if r["vessels"] == 1 else "s", 100 * r["share"])
                    for _, r in td.iterrows())
                cc[1].markdown('<div style="padding-top:2.2rem;font-size:1rem">%s<div style="margin-top:.8rem;color:#777;font-size:.85rem">'
                               '%d anomalous vessels confirmed so far, by kind of behaviour.</div></div>' % (lines, int(td["vessels"].sum())),
                               unsafe_allow_html=True)
        else:
            type_ph.caption("The chart appears when the first anomalous vessel is confirmed.")
        if s["recent_scores"] and alt is not None:
            df = pd.DataFrame({"n": range(len(s["recent_scores"])), "score": s["recent_scores"]})
            base = alt.Chart(df).mark_line(color="#2a6fb0").encode(
                x=alt.X("n:Q", title="latest windows (older to newer)"),
                y=alt.Y("score:Q", scale=alt.Scale(domain=[0, 1]), title="anomaly score"))
            rule = alt.Chart(pd.DataFrame({"y": [float(eng.threshold)]})).mark_rule(
                color="#d62728", strokeDash=[5, 3]).encode(y="y:Q")
            chart_ph.altair_chart((base + rule).properties(height=300), use_container_width=True)
        elif s["recent_scores"]:
            chart_ph.line_chart(pd.DataFrame({"score": s["recent_scores"]}))
        else:
            chart_ph.caption("The score chart appears after Start (red dashed line = alert threshold).")

        tot = s["v_tp"] + s["v_fp"] + s["v_tn"] + s["v_fn"]
        with acc_ph.container():
            q = st.columns(4)
            kpi(q[0], "Accuracy", "%.1f%%" % (100.0 * (s["v_tp"] + s["v_tn"]) / tot) if tot else "-", "vessel trips judged correctly")
            kpi(q[1], "Precision", "%.0f%%" % (100 * s["v_precision"]) if s["v_precision"] is not None else "-",
                "vessels called anomalous that really were")
            kpi(q[2], "Recall", "%.0f%%" % (100 * s["v_recall"]) if s["v_recall"] is not None else "-",
                "anomalous trips that were caught")
            kpi(q[3], "False alarms", "{:,}".format(s["v_fp"]), "normal trips wrongly called anomalous")
        note_ph.caption("Judged trip by trip against the labels of the injected anomalies (%s trips so far; a trip counts "
                        "once it has enough data). Short live sample: see Model Performance for the full test-set figures."
                        % "{:,}".format(tot))

    def step():
        if api_mode:
            return
        for _ in range(speed):
            try:
                r = eng.process(next(ss.gen))
            except StopIteration:
                ss.running = False
                return
            if r.get("status") in ("scored", "warming_up"):
                p = ss.trails.setdefault(r["mmsi"], [])
                p.append([round(r["lon"], 4), round(r["lat"], 4)])
                if len(p) > 60:
                    del p[0]

    render()
    while ss.running and ss.gen is not None:
        step()
        render()
        if not ss.running:
            break
        time.sleep(1.0)


# ----------------------------------------------------------------------------- PAGE 2: performance
def curves(y, s):
    o = np.argsort(-s, kind="mergesort")
    y = y[o].astype(float)
    tp, fp = np.cumsum(y), np.cumsum(1 - y)
    P, N = y.sum(), len(y) - y.sum()
    idx = np.unique(np.linspace(0, len(y) - 1, 500).astype(int))
    roc = pd.DataFrame({"fpr": fp[idx] / max(N, 1), "tpr": tp[idx] / max(P, 1)})
    pr = pd.DataFrame({"recall": tp[idx] / max(P, 1), "precision": tp[idx] / np.maximum(tp[idx] + fp[idx], 1)})
    return roc, pr


def page_perf():
    title("Model Performance")
    R = load_results(str(RES), (RES / "metrics.csv").stat().st_mtime if (RES / "metrics.csv").exists() else 0)
    if R["metrics"] is None:
        st.error("No results found in %s. Run run_c1.py first." % RES)
        return
    m = add_scores(R["metrics"])
    W = R["windows"]
    prop = m[m["model"].str.startswith("TimeDecay")].iloc[0]
    st.caption("Results folder: %s  |  test set = held-out vessels the model never saw while training; "
               "anomalies (spoofing, AIS gaps, slowdowns, zig-zags) were injected synthetically." % RES.name)

    k = st.columns(6)
    kpi(k[0], "F1 score", "%.3f" % prop["f1"], "precision and recall combined")
    kpi(k[1], "Precision", "%.1f%%" % (100 * prop["precision"]), "alerts that were real")
    kpi(k[2], "Recall", "%.1f%%" % (100 * prop["recall"]), "real anomalies caught")
    kpi(k[3], "Accuracy", "%.2f%%" % (100 * prop["accuracy"]), "windows judged correctly")
    kpi(k[4], "False-alarm rate", "%.2f%%" % (100 * prop["far"]), "normal windows flagged")
    kpi(k[5], "ROC-AUC", "%.3f" % prop["roc_auc"], "ranking quality (1 = perfect)")

    tot = int(prop["tp"] + prop["fp"] + prop["tn"] + prop["fn"])
    pos = int(prop["tp"] + prop["fn"])
    base_acc = 100.0 * (tot - pos) / tot
    if prop["f1"] < 0.88:
        note("<b>Honest status.</b> F1 = %.2f is below the 0.88 target set in the project proposal. "
             "Spoofing and zig-zag behaviour are caught well; AIS gaps and slowdowns are still weak (see below). "
             "Anomalies are synthetic and the model has not yet been validated on Sri Lankan vessel tracks." % prop["f1"])
    with st.expander("How to read these numbers (and why accuracy alone is misleading)"):
        st.markdown(
            "Only **%.1f%%** of the %s test windows are anomalous. A model that never raises an alert would still reach "
            "**%.1f%%** accuracy while catching nothing. That is why we judge models by **F1**, "
            "**precision** (are the alerts real?) and **recall** (are real anomalies caught?). "
            "Accuracy is shown for completeness, but differences in accuracy between the models are tiny."
            % (100.0 * pos / tot, "{:,}".format(tot), base_acc))

    st.subheader("Model comparison")
    t = m[["model_name", "accuracy", "precision", "recall", "f1", "far", "roc_auc", "pr_auc"]].copy()
    t.columns = ["Method", "Accuracy", "Precision", "Recall", "F1", "False-alarm rate", "ROC-AUC", "PR-AUC"]
    st.table(t.set_index("Method").round(3))
    if alt is not None:
        long = m.melt(id_vars=["model_name"], value_vars=["precision", "recall", "f1"], var_name="metric")
        ch = alt.Chart(long).mark_bar().encode(
            x=alt.X("model_name:N", title=None, sort=list(m["model_name"]), axis=alt.Axis(labelAngle=-20, labelLimit=240)),
            y=alt.Y("value:Q", title="score", scale=alt.Scale(domain=[0, 1])),
            color=alt.Color("metric:N", title="Metric"), xOffset="metric:N",
            tooltip=["model_name", "metric", alt.Tooltip("value:Q", format=".3f")]).properties(height=330)
        st.altair_chart(ch, use_container_width=True)

    if W is not None and len(W):
        thr = float(prop["threshold"])
        y = W["y_true"].values.astype(int)
        s = W["score_ae"].values.astype(float)
        st.subheader("What the model catches")
        a = W[W["y_true"] == 1].copy()
        a["caught"] = (a["score_ae"] >= thr).astype(int)
        rt = a.groupby("anomaly_type").agg(recall=("caught", "mean"), windows=("caught", "size")).reset_index()
        rt["anomaly_type"] = rt["anomaly_type"].map({"spoof": "Spoofing (position jump)", "gap": "AIS gap (switched off)",
                                                      "slowdown": "Sudden slowdown", "zigzag": "Zig-zag course"}).fillna(rt["anomaly_type"])
        c1, c2 = st.columns([3, 2])
        if alt is not None:
            ch = alt.Chart(rt).mark_bar().encode(
                y=alt.Y("anomaly_type:N", sort="-x", title=None),
                x=alt.X("recall:Q", title="share caught (recall)", scale=alt.Scale(domain=[0, 1])),
                color=alt.condition(alt.datum.recall >= 0.5, alt.value("#2e9e5b"), alt.value("#d9534f")),
                tooltip=["anomaly_type", alt.Tooltip("recall:Q", format=".0%"), "windows"]).properties(height=230)
            c1.altair_chart(ch, use_container_width=True)
        c2.table(rt.rename(columns={"anomaly_type": "Anomaly type", "recall": "Recall", "windows": "Windows"})
                   .set_index("Anomaly type").round(3))

        st.subheader("Curves and score separation")
        roc, pr = curves(y, s)
        d1, d2 = st.columns(2)
        if alt is not None:
            pt_tpr, pt_fpr = float(prop["recall"]), float(prop["far"])
            r_ch = alt.Chart(roc).mark_line(color="#2a6fb0").encode(
                x=alt.X("fpr:Q", title="false positive rate"), y=alt.Y("tpr:Q", title="true positive rate"))
            diag = alt.Chart(pd.DataFrame({"x": [0, 1], "y": [0, 1]})).mark_line(color="#999", strokeDash=[4, 3]).encode(x="x:Q", y="y:Q")
            dot = alt.Chart(pd.DataFrame({"x": [pt_fpr], "y": [pt_tpr]})).mark_point(size=110, color="#d62728", filled=True).encode(x="x:Q", y="y:Q")
            d1.markdown("**ROC curve** (red dot = chosen alert threshold)")
            d1.altair_chart((r_ch + diag + dot).properties(height=300), use_container_width=True)
            p_ch = alt.Chart(pr).mark_line(color="#2a6fb0").encode(
                x=alt.X("recall:Q", title="recall"), y=alt.Y("precision:Q", title="precision", scale=alt.Scale(domain=[0, 1])))
            dot2 = alt.Chart(pd.DataFrame({"x": [float(prop["recall"])], "y": [float(prop["precision"])]})).mark_point(
                size=110, color="#d62728", filled=True).encode(x="x:Q", y="y:Q")
            d2.markdown("**Precision-recall curve** (red dot = chosen alert threshold)")
            d2.altair_chart((p_ch + dot2).properties(height=300), use_container_width=True)

            bins = np.linspace(0, 1, 41)
            rows = []
            for lab, mask in (("Normal windows", y == 0), ("Anomalous windows", y == 1)):
                h, _ = np.histogram(s[mask], bins=bins)
                for i, v in enumerate(h / max(mask.sum(), 1)):
                    rows.append({"score": (bins[i] + bins[i + 1]) / 2, "share": float(v), "class": lab})
            hist = alt.Chart(pd.DataFrame(rows)).mark_bar(opacity=0.6, size=9).encode(
                x=alt.X("score:Q", title="anomaly score"), y=alt.Y("share:Q", title="share of windows"),
                color=alt.Color("class:N", title=None, scale=alt.Scale(range=["#2e9e5b", "#d9534f"])))
            rl = alt.Chart(pd.DataFrame({"x": [thr]})).mark_rule(color="#222", strokeDash=[5, 3]).encode(x="x:Q")
            st.markdown("**Score distribution** (dashed line = alert threshold; the further apart the two colours, the better)")
            st.altair_chart((hist + rl).properties(height=280), use_container_width=True)

        st.subheader("Threshold explorer")
        st.caption("Move the threshold to see the trade-off between catching more anomalies and raising more false alarms.")
        t_new = st.slider("Alert threshold", 0.0, 1.0, thr, 0.01, key="perf_thr")
        pred = s >= t_new
        tp, fp = int((pred & (y == 1)).sum()), int((pred & (y == 0)).sum())
        fn, tn = int((~pred & (y == 1)).sum()), int((~pred & (y == 0)).sum())
        prec = tp / (tp + fp) if tp + fp else 0.0
        rec = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
        q = st.columns(5)
        kpi(q[0], "Accuracy", "%.2f%%" % (100.0 * (tp + tn) / len(y)), "")
        kpi(q[1], "Precision", "%.1f%%" % (100 * prec), "")
        kpi(q[2], "Recall", "%.1f%%" % (100 * rec), "")
        kpi(q[3], "F1", "%.3f" % f1, "")
        kpi(q[4], "False-alarm rate", "%.2f%%" % (100.0 * fp / max(fp + tn, 1)), "")
        st.markdown("**Confusion matrix** at this threshold")
        st.table(pd.DataFrame({"Predicted normal": [tn, fn], "Predicted anomaly": [fp, tp]},
                              index=["Actually normal", "Actually anomalous"]))

    with st.expander("Run details"):
        st.json(R["info"])


# ----------------------------------------------------------------------------- PAGE 3: Sri Lankan EEZ
COLORS = {"fishing": [30, 144, 255, 190], "gap": [230, 40, 40, 210], "loitering": [255, 165, 0, 200],
          "encounter": [160, 32, 240, 200]}
LABEL = {"fishing": "Fishing", "gap": "AIS switched off (gap)", "loitering": "Loitering",
         "encounter": "Encounter (ship meets ship)"}


@cached
def load_events(paths, mtimes):
    parts = [pd.read_csv(p) for p in paths if p and os.path.exists(p)]
    if not parts:
        return None
    df = pd.concat(parts, ignore_index=True).drop_duplicates("event_id")
    df["start_time"] = pd.to_datetime(df["start_time"], utc=True, errors="coerce")
    df["month"] = df["start_time"].dt.strftime("%Y-%m")
    return df.dropna(subset=["lat", "lon", "start_time"])


def page_lka():
    title("Sri Lankan EEZ")
    p1 = os.environ.get("GFW_CSV", os.path.join("data", "raw", "gfw_sri_lanka_events_REAL.csv"))
    p2 = os.environ.get("GFW_CSV2", os.path.join("data", "raw", "gfw_rest.csv"))
    paths = (p1, p2)
    mt = tuple(os.path.getmtime(p) if os.path.exists(p) else 0 for p in paths)
    df = load_events(paths, mt)
    if df is None:
        st.error("Events file not found: %s . Run fetch_gfw_events.py first." % p1)
        return
    note("<b>Real data, recorded events.</b> Global Fishing Watch events inside the Sri Lankan EEZ "
         "(fishing, AIS switched off, loitering, ship-to-ship encounters). These are individual events, not full vessel "
         "tracks, so they show what happens in our waters but are not used to train the model.", good=True)

    types = sorted(df["event_type"].unique())
    months = sorted(df["month"].dropna().unique())
    f1, f2 = st.columns([3, 2])
    sel = f1.multiselect("Event types", types, default=types, format_func=lambda t: LABEL.get(t, t))
    mr = f2.select_slider("Months", options=months, value=(months[0], months[-1])) if len(months) > 1 else (months[0], months[0])
    d = df[df["event_type"].isin(sel) & (df["month"] >= mr[0]) & (df["month"] <= mr[1])].copy()

    k = st.columns(len(types) + 1)
    kpi(k[0], "Events shown", "{:,}".format(len(d)), "in the selection")
    for i, t in enumerate(types):
        kpi(k[i + 1], LABEL.get(t, t), "{:,}".format(int((d["event_type"] == t).sum())), "")

    dm = d.sample(20000, random_state=1) if len(d) > 20000 else d
    if len(d) > 20000:
        st.caption("The map draws a random 20,000 of the %s events (the counts above are exact)." % "{:,}".format(len(d)))
    dm = dm.copy()
    dm["name"] = dm["vessel_name"].fillna("").astype(str)
    out = pd.DataFrame({
        "lon": dm["lon"].astype(float), "lat": dm["lat"].astype(float),
        "color": dm["event_type"].map(lambda t: COLORS.get(t, [120, 120, 120, 180])),
        "label": ["%s | %s | %s %s" % (LABEL.get(t, t), str(w)[:16], n, f) for t, w, n, f in
                  zip(dm["event_type"], dm["start_time"], dm["name"], dm["flag"].fillna("").astype(str))]})
    st.markdown('<div class="legend"><span><i class="dot" style="background:rgb(30,144,255)"></i>Fishing</span>'
                '<span><i class="dot" style="background:rgb(230,40,40)"></i>AIS switched off</span>'
                '<span><i class="dot" style="background:rgb(255,165,0)"></i>Loitering</span>'
                '<span><i class="dot" style="background:rgb(160,32,240)"></i>Encounter</span></div>', unsafe_allow_html=True)
    layer = pdk.Layer("ScatterplotLayer", out, get_position="[lon, lat]", get_fill_color="color", get_radius=2500,
                      radius_min_pixels=2, radius_max_pixels=6, pickable=True)
    deck = pdk.Deck(layers=[layer], initial_view_state=pdk.ViewState(latitude=7.6, longitude=81.0, zoom=5.4),
                    tooltip={"text": "{label}"})
    try:
        st.pydeck_chart(deck, height=560)
    except TypeError:
        st.pydeck_chart(deck)

    c1, c2 = st.columns(2)
    c1.subheader("Events per month")
    if alt is not None:
        pm = d.groupby(["month", "event_type"]).size().reset_index(name="events")
        pm["event_type"] = pm["event_type"].map(lambda t: LABEL.get(t, t))
        c1.altair_chart(alt.Chart(pm).mark_bar().encode(
            x=alt.X("month:N", title=None), y=alt.Y("events:Q", title="events"), color=alt.Color("event_type:N", title=None),
            tooltip=["month", "event_type", "events"]).properties(height=280), use_container_width=True)
    else:
        c1.bar_chart(d.groupby(["month", "event_type"]).size().unstack(fill_value=0))
    g = d[d["event_type"] == "gap"]
    c2.subheader("Flags of vessels that switched AIS off")
    if len(g):
        fl = g["flag"].fillna("unknown").value_counts().head(12).reset_index()
        fl.columns = ["flag", "events"]
        if alt is not None:
            c2.altair_chart(alt.Chart(fl).mark_bar(color="#d9534f").encode(
                y=alt.Y("flag:N", sort="-x", title=None), x=alt.X("events:Q"), tooltip=["flag", "events"]).properties(height=280),
                use_container_width=True)
        else:
            c2.bar_chart(fl.set_index("flag"))
    else:
        c2.caption("No AIS-off events in this selection.")
    st.subheader("AIS-off events (the suspicious ones)")
    st.dataframe(g[["start_time", "end_time", "lat", "lon", "mmsi", "vessel_name", "flag"]]
                 .sort_values("start_time").astype(str).head(300))
    st.caption("Source: Global Fishing Watch (globalfishingwatch.org), used for non-commercial research with attribution.")


# ----------------------------------------------------------------------------- PAGE 4: data & method
def page_about():
    title("Data & Method")
    st.caption("How the system works, what it was tested on, and what it cannot yet claim.")
    st.subheader("Pipeline")
    cols = st.columns(5)
    steps = [("1. Ingest", "AIS position reports: vessel id, time, latitude, longitude, speed, course."),
             ("2. Clean", "Invalid positions and speeds removed; each vessel's pings split into tracks at long silences."),
             ("3. Features", "Time gap, speed, course (sin, cos), turn rate, acceleration and implied speed over a window of 10 pings."),
             ("4. Score", "A time-decay GRU autoencoder rebuilds the window. Large reconstruction error = unusual behaviour."),
             ("5. Alert", "Score above the threshold raises an alert, delivered as GeoJSON and shown on the map.")]
    for c, (h, t) in zip(cols, steps):
        c.markdown('<div class="step"><b>%s</b>%s</div>' % (h, t), unsafe_allow_html=True)
    st.subheader("What the model was trained and tested on")
    R = load_results(str(RES), (RES / "metrics.csv").stat().st_mtime if (RES / "metrics.csv").exists() else 0)
    W = R["windows"]
    st.markdown(
        "- **Training data:** recorded fishing-vessel tracks from Global Fishing Watch (international waters, not Sri Lanka). "
        "The model only sees normal behaviour while training.\n"
        "- **Split:** by vessel, so the test vessels are never seen in training.\n"
        "- **Anomalies for testing:** injected synthetically into validation and test vessels only - spoofing (position jump), "
        "AIS gaps (20 minutes to 4 hours), sudden slowdowns and zig-zag courses.\n"
        "- **Threshold:** chosen on validation data (best F1 with false-alarm rate at most 5%).\n"
        "- **Compared against:** Isolation Forest, One-Class SVM and static threshold rules.")
    if W is not None and len(W):
        k = st.columns(3)
        kpi(k[0], "Test windows", "{:,}".format(len(W)), "never seen in training")
        kpi(k[1], "Anomalous share", "%.1f%%" % (100.0 * W["y_true"].mean()), "injected anomalies")
        kpi(k[2], "Test vessels", "{:,}".format(W["mmsi"].nunique()), "held out")
    st.subheader("Limits and next steps")
    note("<b>What this work does not yet show.</b> The model has not been validated on Sri Lankan vessel tracks (no such "
         "track data was available); the anomalies used for testing are synthetic; AIS-gap and slowdown detection is weak; "
         "and the proposal's F1 target of 0.88 has not been reached.")
    st.markdown(
        "- **Sri Lankan validation:** obtain a small anonymised AIS extract for Sri Lankan waters and test the same model on it.\n"
        "- **Gap and slowdown detection:** add a dedicated detector for silences and speed changes alongside the autoencoder.\n"
        "- **More baselines:** Extended Kalman Filter and TD-DBSCAN, listed in the proposal, are not implemented yet.\n"
        "- **Real-time input:** connect a live AIS source with coverage around Sri Lanka (free public feeds have almost none).")
    st.subheader("Data sources")
    st.markdown("- Global Fishing Watch (globalfishingwatch.org): vessel tracks and Sri Lankan EEZ events, used for non-commercial research with attribution.\n"
                "- Sri Lankan EEZ boundary: Marine Regions (marineregions.org), used through the Global Fishing Watch events filter.")


# ----------------------------------------------------------------------------- navigation
st.sidebar.markdown('<div class="brand">Vessel Behaviour<br>Anomaly Detection</div>'
                    '<div class="sub">Sri Lankan EEZ monitoring</div>', unsafe_allow_html=True)
PAGES = ["Live Monitor", "Model Performance", "Sri Lankan EEZ", "Data & Method"]
try:
    page = st.sidebar.radio("Navigation", PAGES, label_visibility="collapsed")
except TypeError:
    page = st.sidebar.radio("Navigation", PAGES)
sim_box = st.sidebar.container()                    # the simulation controls appear here (Live Monitor only)
if page == "Live Monitor":
    st.sidebar.markdown(
        '<div class="note"><b>Simulated feed.</b> Recorded international vessel tracks (Global Fishing Watch) are '
        'replayed ping by ping as if they were arriving live, with synthetic anomalies injected into vessels the model '
        'never saw in training. This is <b>not</b> real-time Sri Lankan AIS.</div>', unsafe_allow_html=True)
st.sidebar.markdown("---")
st.sidebar.caption("Model: %s" % RES.name)
st.sidebar.caption("IT23135352 | J26-IT-364 | SLIIT")

if page == "Live Monitor":
    page_live(sim_box)
else:
    {"Model Performance": page_perf, "Sri Lankan EEZ": page_lka, "Data & Method": page_about}[page]()