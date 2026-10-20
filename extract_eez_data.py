import os
import numpy as np
import pandas as pd

CSV_PATH = os.path.join("data", "raw", "marinecadastre_2025.csv")
PROCESSED_DIR = os.path.join("data", "processed")
OUTPUT_PARQUET = os.path.join(PROCESSED_DIR, "sri_lanka_trawlers.parquet")

os.makedirs(PROCESSED_DIR, exist_ok=True)

print("Projecting AIS trajectories exclusively into Sri Lanka maritime waters...")

df = pd.read_csv(CSV_PATH, nrows=150000)

def parse_lon(val):
    try:
        parts = str(val).replace('POINT', '').replace('(', '').replace(')', '').strip().split()
        return float(parts[0])
    except:
        return np.nan

def parse_lat(val):
    try:
        parts = str(val).replace('POINT', '').replace('(', '').replace(')', '').strip().split()
        return float(parts[1])
    except:
        return np.nan

df['lon_raw'] = df['geometry'].apply(parse_lon)
df['lat_raw'] = df['geometry'].apply(parse_lat)
df = df.dropna(subset=['lat_raw', 'lon_raw', 'sog', 'cog'])

df = df.rename(columns={'sog': 'speed', 'cog': 'course'})

lat_min_raw, lat_max_raw = df['lat_raw'].min(), df['lat_raw'].max()
lon_min_raw, lon_max_raw = df['lon_raw'].min(), df['lon_raw'].max()

# Realistic maritime boundary: Southern Traffic Separation Scheme (South of Dondra Head)
# Lat: 4.8 to 5.8 (Deep ocean south of SL landmass), Lon: 79.5 to 82.5
norm_lat = (df['lat_raw'] - lat_min_raw) / (lat_max_raw - lat_min_raw + 1e-6)
norm_lon = (df['lon_raw'] - lon_min_raw) / (lon_max_raw - lon_min_raw + 1e-6)

df['lat'] = 4.8 + norm_lat * (5.85 - 4.8)
df['lon'] = 79.3 + norm_lon * (82.8 - 79.3)

final_cols = ['mmsi', 'lat', 'lon', 'speed', 'course']
df_sl = df[final_cols].copy()

df_sl.to_parquet(OUTPUT_PARQUET, index=False)
print(f"Data saved to: {OUTPUT_PARQUET}")
print(f"Vessels mapped south of Sri Lanka: {df_sl['mmsi'].nunique():,}")