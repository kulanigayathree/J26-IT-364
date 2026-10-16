import os
import json
import joblib
import pandas as pd
import numpy as np
import streamlit as st
import folium
from streamlit_folium import st_folium

# ─────────────────────────────────────────────────────────────
# PAGE CONFIGURATION
# ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Maritime Command - Sri Lanka EEZ",
    page_icon="⚓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─────────────────────────────────────────────────────────────
# CUSTOM STYLING (MARITIME INTELLIGENCE COMMAND UI)
# ─────────────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    .main .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
        max-width: 100%;
    }

    .metric-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 16px 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .metric-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #64748b;
        margin-bottom: 4px;
    }

    .metric-value {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
        font-family: 'JetBrains Mono', monospace;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }

    .status-live {
        background: rgba(34, 197, 94, 0.12);
        color: #16a34a;
        border: 1px solid rgba(34, 197, 94, 0.3);
    }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────
# DATA & MODEL LOADING PIPELINE
# ─────────────────────────────────────────────────────────────
@st.cache_data
def load_vessel_data():
    parquet_path = os.path.join("data", "processed", "sri_lanka_trawlers.parquet")
    model_path = os.path.join("models", "vessel_anomaly_detector.pkl")

    if not os.path.exists(parquet_path):
        return pd.DataFrame()

    df = pd.read_parquet(parquet_path)

    # Clean numeric fields
    df['speed'] = df['speed'].fillna(0)
    df['course'] = df['course'].fillna(0)

    # Feature engineering for ML inference
    df['speed_diff'] = df.groupby('mmsi')['speed'].diff().fillna(0).abs()
    df['course_diff'] = df.groupby('mmsi')['course'].diff().fillna(0).abs()

    # Predict anomalies using trained Isolation Forest artifact
    if os.path.exists(model_path):
        try:
            model = joblib.load(model_path)
            features = ['speed', 'course', 'speed_diff', 'course_diff']
            preds = model.predict(df[features])
            df['is_anomaly'] = (preds == -1).astype(int)
        except Exception:
            df['is_anomaly'] = 0
    else:
        df['is_anomaly'] = 0

    return df

@st.cache_data
def load_eez_boundary():
    geojson_path = os.path.join("data", "raw", "sri_lanka_eez.geojson")
    if os.path.exists(geojson_path):
        try:
            with open(geojson_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

df_vessels = load_vessel_data()
eez_boundary = load_eez_boundary()

total_tracked = df_vessels['mmsi'].nunique() if not df_vessels.empty else 0
total_anomalies = df_vessels[df_vessels['is_anomaly'] == 1]['mmsi'].nunique() if not df_vessels.empty else 0

# ─────────────────────────────────────────────────────────────
# SIDEBAR CONTROLS
# ─────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
        <div style="font-size:28px;">⚓</div>
        <div>
            <div style="font-size:16px; font-weight:800; color:#0f172a;">MARITIME OS</div>
            <div style="font-size:10px; font-weight:700; color:#64748b; letter-spacing:1px;">COMMAND CENTER</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    sector = st.selectbox(
        "ACTIVE SECTOR",
        ["Sri Lanka Complete EEZ", "Southern Traffic Separation Scheme", "Mannar Basin", "Bay of Bengal Corridor"]
    )

    all_vessels = ["All Tracked Vessels"] + (sorted(df_vessels['mmsi'].dropna().unique().astype(str).tolist()) if not df_vessels.empty else [])
    selected_vessel = st.selectbox("VESSEL FILTER (MMSI)", all_vessels)

    sensitivity = st.slider("DETECTION SENSITIVITY", min_value=0.50, max_value=0.99, value=0.75, step=0.05)
    show_normal = st.checkbox("Show Normal Vessel Tracks", value=True)
    show_anomalies = st.checkbox("Highlight Behavioral Anomalies", value=True)

# ─────────────────────────────────────────────────────────────
# TOP HEADER & KPI METRICS
# ─────────────────────────────────────────────────────────────
col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    st.markdown("""
    <div style="margin-bottom: 20px;">
        <span class="status-badge status-live">● LIVE STREAM</span>
        <h2 style="font-weight:800; margin: 8px 0 4px 0; color:#0f172a;">Maritime Vessel Anomaly & Trajectory Hub</h2>
        <div style="color:#64748b; font-size:13px; font-weight:500;">Real-Time Geospatial Intelligence System • Exclusive Economic Zone (EEZ)</div>
    </div>
    """, unsafe_allow_html=True)

with col_h2:
    st.markdown("""
    <div style="text-align:right; padding-top:10px;">
        <span style="font-family:'JetBrains Mono'; font-size:11px; font-weight:700; color:#16a34a;">● ONLINE & NOMINAL</span>
        <div style="font-size:11px; color:#64748b; margin-top:2px;">AIS FEED STREAMING</div>
    </div>
    """, unsafe_allow_html=True)

kpi1, kpi2, kpi3, kpi4 = st.columns(4)
with kpi1:
    st.markdown(f"""
    <div class="metric-card">
        <div>
            <div class="metric-title">Zone</div>
            <div class="metric-value">SL-EEZ</div>
        </div>
        <div style="font-size:24px;">🌐</div>
    </div>
    """, unsafe_allow_html=True)

with kpi2:
    st.markdown(f"""
    <div class="metric-card">
        <div>
            <div class="metric-title">AIS Stream</div>
            <div class="metric-value" style="color:#16a34a;">Active</div>
        </div>
        <div style="font-size:24px;">📡</div>
    </div>
    """, unsafe_allow_html=True)

with kpi3:
    st.markdown(f"""
    <div class="metric-card">
        <div>
            <div class="metric-title">Tracked</div>
            <div class="metric-value">{total_tracked:,}</div>
        </div>
        <div style="font-size:24px;">🚢</div>
    </div>
    """, unsafe_allow_html=True)

with kpi4:
    st.markdown(f"""
    <div class="metric-card">
        <div>
            <div class="metric-title">Anomalies</div>
            <div class="metric-value" style="color:#ef4444;">{total_anomalies:,}</div>
        </div>
        <div style="font-size:24px;">⚠️</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────
# GEOSPATIAL TRAJECTORY MAP ENGINE
# ─────────────────────────────────────────────────────────────
st.markdown("##### 🗺️ Sri Lanka Exclusive Economic Zone & Vessel Tracks")

# Initialize Folium Map with clean standard OpenStreetMap (no watermark)
m = folium.Map(
    location=[6.5, 80.8],
    zoom_start=7,
    tiles="OpenStreetMap",
    prefer_canvas=True
)

# Render EEZ Boundary if GeoJSON exists
if eez_boundary:
    folium.GeoJson(
        eez_boundary,
        name="Sri Lanka EEZ Boundary",
        style_function=lambda x: {
            "fillColor": "#0ea5e9",
            "color": "#0284c7",
            "weight": 2,
            "dashArray": "6, 6",
            "fillOpacity": 0.08
        }
    ).add_to(m)

# Filter dataset based on UI selection
plot_df = df_vessels.copy()
if selected_vessel != "All Tracked Vessels":
    plot_df = plot_df[plot_df['mmsi'].astype(str) == selected_vessel]

# Plot Vessel Trajectories
if not plot_df.empty:
    vessel_groups = plot_df.groupby('mmsi')
    
    max_paths = 100 if selected_vessel == "All Tracked Vessels" else len(vessel_groups)
    rendered = 0
    
    for mmsi, group in vessel_groups:
        if rendered >= max_paths:
            break
        
        has_anomaly = (group['is_anomaly'] == 1).any()
        points = group[['lat', 'lon']].values.tolist()
        
        if len(points) < 2:
            continue
            
        if has_anomaly and show_anomalies:
            folium.PolyLine(
                points,
                color="#ef4444",
                weight=3,
                opacity=0.85,
                tooltip=f"MMSI: {mmsi} [ANOMALOUS ACTIVITY]"
            ).add_to(m)
            anomaly_pt = group[group['is_anomaly'] == 1].iloc[0]
            folium.CircleMarker(
                location=[anomaly_pt['lat'], anomaly_pt['lon']],
                radius=4,
                color="#dc2626",
                fill=True,
                fillColor="#ef4444",
                fill_opacity=0.9
            ).add_to(m)
            rendered += 1
        elif not has_anomaly and show_normal:
            folium.PolyLine(
                points,
                color="#2563eb",
                weight=1.8,
                opacity=0.6,
                tooltip=f"MMSI: {mmsi} [Normal Track]"
            ).add_to(m)
            rendered += 1

folium.LayerControl().add_to(m)

st_folium(m, width="100%", height=620, returned_objects=[])

# ─────────────────────────────────────────────────────────────
# STATUS FOOTER
# ─────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding:12px 18px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; font-family:'JetBrains Mono'; font-size:11px; color:#64748b;">
    <div>AIS FEED NOMINAL • BOUNDARY: SRI LANKA EEZ</div>
    <div>ACTIVE SECTOR: {sector.upper()}</div>
    <div>VESSELS LOADED: {total_tracked:,}</div>
    <div>SENSITIVITY: {int(sensitivity * 100)}%</div>
</div>
""", unsafe_allow_html=True)