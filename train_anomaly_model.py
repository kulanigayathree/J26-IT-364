import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

DATA_FILE = os.path.join("data", "processed", "sri_lanka_trawlers.parquet")
MODEL_DIR = "models"
MODEL_FILE = os.path.join(MODEL_DIR, "vessel_anomaly_detector.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

if not os.path.exists(DATA_FILE):
    print(f"Error: {DATA_FILE} not found. Please run extract_eez_data.py first.")
    exit()

print("Loading processed AIS dataset...")
df = pd.read_parquet(DATA_FILE)

# Clean null values
df['speed'] = df['speed'].fillna(0)
df['course'] = df['course'].fillna(0)

# Calculate kinematic movement differentials
df['speed_diff'] = df.groupby('mmsi')['speed'].diff().fillna(0).abs()
df['course_diff'] = df.groupby('mmsi')['course'].diff().fillna(0).abs()

features = ['speed', 'course', 'speed_diff', 'course_diff']
X = df[features]

print(f"Training Isolation Forest model on {len(X):,} vessel data points...")

# Configure Isolation Forest (3% expected anomaly rate)
model = IsolationForest(
    n_estimators=100,
    contamination=0.03,
    random_state=42,
    n_jobs=-1
)

model.fit(X)

# Save the trained model artifact
joblib.dump(model, MODEL_FILE)
print(f"Model successfully trained and saved to: {MODEL_FILE}")

# Evaluate predictions
preds = model.predict(X)
anomalies = (preds == -1).sum()
print(f"Anomalies identified: {anomalies:,} ({(anomalies / len(X)) * 100:.2f}%)")