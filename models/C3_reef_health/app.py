"""
Reef Health Monitor - Component 3 (PP1 prototype)
Sentinel-2 based benthic habitat classification for Sri Lankan reefs.

Run (from any folder):  streamlit run models/C3_reef_health/app.py
Paths are relative to this file (models/C3_reef_health/):
  best_model.joblib                   (saved by the Day 2 training notebook; models/best_model.joblib also works)
  data/     S2_<SITE>_composite.tif   (bands B2,B3,B4,B8,B11, scaled x10000, nodata -9999)  - local only, not in git
            ACA_<SITE>_label.tif      (optional: reef extent mask, 0 = no reef)              - local only, not in git
            dhw_<SITE>.csv            (columns: time, CRW_DHW)
  results/  model_comparison.csv, ablation_results.csv, *.png (optional)
"""
import glob
import os
import re

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio
import streamlit as st
from matplotlib.colors import to_rgb
from matplotlib.patches import Patch
from rasterio.io import MemoryFile

st.set_page_config(page_title="Reef Health Monitor (C3)", page_icon="🪸", layout="wide")

CLASSES = {11: "Sand", 12: "Rubble", 13: "Rock", 14: "Seagrass",
           15: "Coral/Algae", 18: "Microalgal Mats"}
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(APP_DIR, "data")
RESULTS_DIR = os.path.join(APP_DIR, "results")
MODEL_CANDIDATES = [os.path.join(APP_DIR, "best_model.joblib"),
                    os.path.join(APP_DIR, "models", "best_model.joblib")]

COLORS = {11: "#f4e4b0", 12: "#b0a99f", 13: "#5f6b7a", 14: "#3f9c4a",
          15: "#ff7f50", 18: "#8b5a2b"}


# ---------------- preprocessing (must match the training notebook) ----------------
def read_tif(src):
    arr = src.read().astype("float32")
    arr[arr <= 0] = np.nan          # nodata (-9999) and invalid pixels
    return arr / 10000.0            # back to reflectance


def estimate_glint(arr, dark_pct=10):
    """Hedley-type sunglint parameters from the image's optically-deep (darkest) water."""
    b2, b3, b4, b8 = arr[0], arr[1], arr[2], arr[3]
    valid = np.isfinite(b2) & np.isfinite(b3) & np.isfinite(b4) & np.isfinite(b8)
    dark = b3 - b8
    deep = valid & (dark <= np.nanpercentile(dark[valid], dark_pct))
    nir = b8[deep]
    g = {"min_nir": float(np.percentile(nir, 1)), "n_deep": int(deep.sum())}
    for name, b in zip(["B2", "B3", "B4"], [b2, b3, b4]):
        g[name] = float(np.clip(np.polyfit(nir, b[deep], 1)[0], 0, 2))
    return g


def make_features(arr, bundle):
    g = estimate_glint(arr, bundle.get("glint_dark_pct", 10))
    f = {}
    for i, b in enumerate(["B2", "B3", "B4"]):
        f[b] = arr[i]
        f[b + "g"] = np.clip(arr[i] - g[b] * (arr[3] - g["min_nir"]), 1e-4, None)
    f["r23"] = np.log(f["B2g"]) - np.log(f["B3g"])
    f["r24"] = np.log(f["B2g"]) - np.log(f["B4g"])
    return np.stack([f[k] for k in bundle["features"]], axis=-1), g


def predict(arr, bundle, mask=None):
    feat, g = make_features(arr, bundle)
    valid = np.isfinite(feat).all(axis=-1)
    if mask is not None:
        valid &= mask
    pred = np.zeros(valid.shape, dtype=np.int16)
    if valid.any():
        y = bundle["model"].predict(feat[valid])
        pred[valid] = bundle["le"].inverse_transform(np.asarray(y).astype(int))
    return pred, valid, g


def reef_mask_for(name, shape):
    """Use data/ACA_<SITE>_label.tif as reef-extent mask when it matches the image."""
    m = re.match(r"S2_(\w+?)_composite", name)
    path = os.path.join(DATA_DIR, f"ACA_{m.group(1)}_label.tif") if m else None
    if path and os.path.exists(path):
        with rasterio.open(path) as src:
            aca = src.read(1)
        if aca.shape == shape:
            return aca > 0
    return None


# ---------------- display helpers ----------------
@st.cache_resource
def load_bundle():
    for path in MODEL_CANDIDATES:
        if os.path.exists(path):
            return joblib.load(path)
    raise FileNotFoundError(MODEL_CANDIDATES[0])


def rgb_image(arr):
    rgb = np.stack([arr[2], arr[1], arr[0]], axis=-1) / 0.15   # true colour stretch
    return np.nan_to_num(np.clip(rgb, 0, 1), nan=1.0)


def class_image(pred, valid):
    img = np.ones(pred.shape + (3,))
    for code, col in COLORS.items():
        img[(pred == code) & valid] = to_rgb(col)
    return img


def show_image(img, title, legend=False, present_codes=()):
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.imshow(img, interpolation="nearest")
    ax.set_title(title)
    ax.axis("off")
    if legend:
        handles = [Patch(color=COLORS[c], label=CLASSES[c]) for c in present_codes if c in COLORS]
        ax.legend(handles=handles, loc="lower center", bbox_to_anchor=(0.5, -0.22),
                  ncol=3, fontsize=8, frameon=False)
    st.pyplot(fig)
    plt.close(fig)


# ---------------- UI ----------------
st.title("🪸 Reef Health Monitor — Component 3")
st.caption("Sentinel-2 based benthic habitat classification for Sri Lankan reefs · PP1 prototype")

try:
    bundle = load_bundle()
except FileNotFoundError:
    st.error(f"best_model.joblib not found. Copy the trained model (Day 2 notebook output) to: {MODEL_CANDIDATES[0]}")
    st.stop()

with st.sidebar:
    st.header("Input")
    files = sorted(glob.glob(os.path.join(DATA_DIR, "S2_*.tif")))
    names = [os.path.basename(f) for f in files]
    choice = st.selectbox("Sentinel-2 composite", names) if names else None
    upload = st.file_uploader("…or upload a GeoTIFF (B2,B3,B4,B8,B11 ×10000)",
                              type=["tif", "tiff"])
    use_mask = st.checkbox("Limit to reef extent (ACA)", value=True,
                           help="Classify only inside the Allen Coral Atlas reef extent when "
                                "a matching data/ACA_<SITE>_label.tif exists.")
    run = st.button("Run model", type="primary", width="stretch")
    st.markdown("---")
    st.markdown(f"**Model:** {bundle.get('name', 'unknown')}")
    st.markdown(f"**Preprocessing:** {bundle.get('feature_set', '-')}")
    st.markdown(f"**Features:** {', '.join(bundle.get('features', []))}")
    if "cv_macro_f1" in bundle:
        st.markdown(f"**Spatial-CV macro-F1:** {bundle['cv_macro_f1']:.3f}")

if run:
    if upload is not None:
        with MemoryFile(upload.read()) as mem, mem.open() as src:
            arr = read_tif(src)
        label = upload.name
    elif choice:
        with rasterio.open(os.path.join(DATA_DIR, choice)) as src:
            arr = read_tif(src)
        label = choice
    else:
        st.warning("Select or upload an image first.")
        st.stop()
    mask = reef_mask_for(label, arr.shape[1:]) if use_mask else None
    with st.spinner("Correcting sunglint and classifying pixels…"):
        pred, valid, g = predict(arr, bundle, mask)
    st.session_state["result"] = (label, arr, pred, valid, g, mask is not None)

tab_map, tab_cover, tab_model, tab_dhw = st.tabs(
    ["🗺️ Habitat map", "📊 Benthic cover", "🤖 Model comparison", "🌡️ Thermal stress (DHW)"])

result = st.session_state.get("result")

with tab_map:
    if result is None:
        st.info("Choose an image in the sidebar and press **Run model**.")
    else:
        label, arr, pred, valid, g, masked = result
        present = [c for c in CLASSES if (pred[valid] == c).any()]
        c1, c2 = st.columns(2)
        with c1:
            show_image(rgb_image(arr), f"Sentinel-2 true colour\n{label}")
        with c2:
            show_image(class_image(pred, valid), "Predicted benthic habitat",
                       legend=True, present_codes=present)
        st.caption(("Classified inside the ACA reef extent. " if masked else
                    "No reef-extent mask: all water pixels classified (deep water will be mislabelled). ")
                   + f"Sunglint slopes B2/B3/B4 = {g['B2']:.2f}/{g['B3']:.2f}/{g['B4']:.2f}, "
                     f"from {g['n_deep']:,} deep-water pixels.")

with tab_cover:
    if result is None:
        st.info("Run the model to see benthic cover.")
    else:
        label, arr, pred, valid, g, masked = result
        vals, counts = np.unique(pred[valid], return_counts=True)
        cover = pd.DataFrame({
            "Class": [CLASSES.get(int(v), str(v)) for v in vals],
            "Pixels": counts,
            "Area (ha)": counts * 100 / 10000,       # 10 m pixel = 100 m²
            "Cover (%)": counts / counts.sum() * 100,
        }).sort_values("Cover (%)", ascending=False)

        m1, m2, m3 = st.columns(3)
        coral = cover.loc[cover["Class"] == "Coral/Algae", "Cover (%)"].sum()
        m1.metric("Coral/Algae cover", f"{coral:.1f} %")
        m2.metric("Mapped area", f"{cover['Area (ha)'].sum():.1f} ha")
        m3.metric("Classes found", len(cover))

        st.bar_chart(cover.set_index("Class")["Cover (%)"])
        st.dataframe(cover.round(2), hide_index=True, width="stretch")
        st.download_button("Download cover table (CSV)", cover.to_csv(index=False),
                           file_name=f"benthic_cover_{label}.csv")

with tab_model:
    path = os.path.join(RESULTS_DIR, "model_comparison.csv")
    if os.path.exists(path):
        res = pd.read_csv(path)
        st.subheader("Model comparison (spatial 5-fold CV, ~500 m blocks)")
        st.dataframe(res.round(3), hide_index=True, width="stretch")
        st.bar_chart(res.set_index("model")[["accuracy", "macro_f1", "kappa"]])
        st.caption(f"Selected model (highest macro-F1): **{res.iloc[0]['model']}**")
    else:
        st.info("results/model_comparison.csv not found.")

    abl = os.path.join(RESULTS_DIR, "ablation_results.csv")
    if os.path.exists(abl):
        st.subheader("Preprocessing ablation (macro-F1)")
        a = pd.read_csv(abl)
        st.dataframe(a.pivot(index="model", columns="feature_set", values="macro_f1").round(3),
                     width="stretch")
        st.caption("FS1 = raw bands · FS2 = + sunglint correction · FS3 = + depth-invariant log ratios")

    imgs = [p for p in ["confusion_matrix.png", "ablation_macro_f1.png", "feature_importance.png"]
            if os.path.exists(os.path.join(RESULTS_DIR, p))]
    if imgs:
        cols = st.columns(len(imgs))
        for col, p in zip(cols, imgs):
            col.image(os.path.join(RESULTS_DIR, p), width="stretch")

with tab_dhw:
    dhw_files = sorted(glob.glob(os.path.join(DATA_DIR, "dhw_*.csv")))
    if dhw_files:
        f = st.selectbox("Site", dhw_files, format_func=os.path.basename)
        dhw = pd.read_csv(f, parse_dates=["time"]).set_index("time")
        d1, d2 = st.columns(2)
        d1.metric("Max DHW", f"{dhw['CRW_DHW'].max():.1f} °C-weeks")
        d2.metric("Date of max", str(dhw['CRW_DHW'].idxmax().date()))
        st.line_chart(dhw["CRW_DHW"])
        st.caption("DHW ≥ 4 °C-weeks: significant bleaching risk · DHW ≥ 8: severe. "
                   "Source: NOAA Coral Reef Watch (5 km).")
    else:
        st.info("No data/dhw_*.csv file found.")

st.markdown("---")
st.caption("Outputs are satellite-derived indicators, not confirmed ecological health assessments. "
           "Labels: Allen Coral Atlas (reference labels). Imagery: Copernicus Sentinel-2.")
