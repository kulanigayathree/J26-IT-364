# C1 – Vessel Behaviour Anomaly Detection

Proposal-aligned pipeline (J26-IT-364, Component 1).

## What it does
1. Loads real AIS tracks (MarineCadastre CSV), cleans them, splits tracks at gaps > 6 h.
2. Splits **by vessel (MMSI)** into train / val / test (no leakage).
3. Injects **labelled synthetic anomalies** into val/test vessels only: GPS spoof, AIS gap (20 min–4 h), 12–16 kn → 2–4 kn slowdown, zig-zag.
4. Features per ping: `log_dt, sog, cog_sin, cog_cos, rot, accel, implied_kn`. **Lat/Lon are not model inputs.**
5. Time-decay GRU autoencoder trained on clean train windows (10 pings). Anomaly score ∈ [0,1).
6. Gap analyzer (rule, > 20 min silence) + autoencoder = full C1 engine.
7. Baselines: static threshold, Isolation Forest, One-Class SVM.
8. Threshold chosen on **validation** (max F1 with FAR ≤ 5%), reported on **test**.

## Run
```bash
cd models/C1_vessel_anomaly
python run_c1.py --csv ../../data/raw/marinecadastre_2025.csv --inspect   # see your column names
# edit c1_config.yaml -> columns:  (values must match your CSV)
python run_c1.py --csv ../../data/raw/marinecadastre_2025.csv
python run_c1.py --demo --epochs 6      # FAKE data, only checks the code runs
```
Outputs: `results_c1/metrics.json|csv`, `model.pt`, `scaler.json`.

## Data rules (important for the viva)
- Use the **original coordinates and timestamps**. Do not relocate US data to Sri Lanka.
- Describe MarineCadastre as a *proxy corpus of real vessel dynamics*; real Indian Ocean data (e.g. Global Fishing Watch) is for evaluation/transfer tests.
- Injected anomalies are synthetic ground truth, as stated in the proposal (section 3.2). Say so in the report.
- Demo mode output is fake. Never report it.

## Not done yet (proposal items still missing)
- Extended Kalman Filter and TD-DBSCAN baselines; offline Trajectory Transformer baseline.
- EEZ / MPA geofence layer (point-in-polygon with `sri_lanka_eez.geojson`) and boundary-distance features.
- Dead-reckoning search box for gaps, GeoJSON alert export, hysteresis threshold controller.
- Streaming throughput (msg/s) and ADE-over-blackout metrics; repeating runs 10× for mean ± std.
- Real Indian Ocean evaluation data.
