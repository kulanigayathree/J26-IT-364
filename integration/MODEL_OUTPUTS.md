# Model outputs: how each model plugs into the app

There are two ways a model appears on the website:

1. **Latest results** (all components): the model's exported JSON file, described below.
2. **"Try the model"** (on each component page): the API runs or replays the trained model on user input.
   See [Live model runs](#live-model-runs-try-the-model) at the end for the files each one needs.

The API does **not** run any model code. Each member exports their model's latest predictions from
their notebook as one JSON file, and the API reads it:

| Component | Put your file here | Read by |
| --- | --- | --- |
| C1 | `integration/model_outputs/c1/anomalies.json` | `integration/api/app/adapters/c1.py` |
| C2 | `integration/model_outputs/c2/forecast.json` | `integration/api/app/adapters/c2.py` |
| C3 | `integration/model_outputs/c3/reefs.json` | `integration/api/app/adapters/c3.py` |
| C4 | `integration/model_outputs/c4/spills.json` | `integration/api/app/adapters/c4.py` |

If your file is missing, the API uses `sample_<name>.json` from the same folder and the page shows a
**Sample data** badge. Do not edit the sample files; add your real file next to them.

Rules for every file:

- Top-level fields `model_name`, `model_version` and `generated_at` (ISO 8601 UTC, e.g. `"2026-10-21T00:30:00Z"`).
- Coordinates are WGS84 **lon/lat** in decimal degrees.
- Times are ISO 8601 UTC with a `Z`.
- UTF-8 JSON. No restart needed: the API reads the file on every request.

Check your file by opening the matching page (or `http://localhost:8000/docs` → `/api/cX/data`).
If the format is wrong, the page shows an error and the uvicorn terminal prints a validation
error that names the bad field.

---

## C1 – `anomalies.json`

```json
{
  "model_name": "C1 Isolation Forest + rules",
  "model_version": "0.4",
  "generated_at": "2026-10-21T00:30:00Z",
  "vessels": [
    {"vessel_id": "417000231", "name": "Sayuri 3", "type": "Fishing", "lon": 79.42, "lat": 7.18, "time": "2026-10-21T00:10:00Z"}
  ],
  "anomalies": [
    {"id": "A001", "vessel_id": "419001877", "vessel_name": "Sri Murugan", "anomaly_type": "ais_gap",
     "score": 0.78, "severity": "high", "time": "2026-10-20T18:50:00Z", "lon": 79.80, "lat": 9.31,
     "description": "AIS silent for 5 h 40 min near the maritime boundary."}
  ]
}
```

- `vessels`: latest position of each tracked vessel.
- `anomaly_type`: `ais_gap`, `loitering`, `speed_change`, `route_deviation`, `dark_vessel` (other values are shown as written).
- `score` 0–1, `severity` `low` | `medium` | `high`. Use `"unknown"` as `vessel_id` for SAR-only detections.
- "Anomalies today" on the dashboard = anomalies in the 24 h before `generated_at`.

```python
import json, pandas as pd
from datetime import datetime, timezone

def sev(s): return "high" if s >= 0.7 else "medium" if s >= 0.45 else "low"

out = {
    "model_name": "C1 Isolation Forest + rules",
    "model_version": "0.4",
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "vessels": [
        {"vessel_id": str(r.mmsi), "name": r.name, "type": r.vessel_type, "lon": float(r.lon),
         "lat": float(r.lat), "time": r.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")}
        for r in latest_positions.itertuples()          # your DataFrame
    ],
    "anomalies": [
        {"id": f"A{i:04d}", "vessel_id": str(r.mmsi), "vessel_name": r.name, "anomaly_type": r.anomaly_type,
         "score": round(float(r.score), 3), "severity": sev(r.score),
         "time": r.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"), "lon": float(r.lon), "lat": float(r.lat),
         "description": r.reason}
        for i, r in enumerate(anomalies_df.itertuples())  # your DataFrame
    ],
}
with open("integration/model_outputs/c1/anomalies.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
```

---

## C2 – `forecast.json`

A fixed 0.25° grid of cell **centres** over 3–13° N, 76–87° E: `lat` has 40 values
(3.125 … 12.875) and `lon` has 44 values (76.125 … 86.875). Each lead day has two 40×44 arrays
indexed `[lat][lon]`; use `null` for land cells.

```json
{
  "model_name": "C2 ConvLSTM (catch-conditioned)",
  "model_version": "0.3",
  "generated_at": "2026-10-21T00:30:00Z",
  "issued_date": "2026-10-21",
  "grid": {"lat": [3.125, 3.375, "… 40 values"], "lon": [76.125, 76.375, "… 44 values"]},
  "leads": {
    "1": {"date": "2026-10-21", "probability": [[0.04, 0.05, null, "…"], "… 40 rows"], "uncertainty": [["…"]]},
    "2": {"date": "2026-10-22", "probability": [["…"]], "uncertainty": [["…"]]},
    "3": {"date": "2026-10-23", "probability": [["…"]], "uncertainty": [["…"]]}
  }
}
```

- `probability` 0–1 = chance of a good catch. `uncertainty` 0–1 (e.g. ensemble std or interval half-width).
- The API ranks the top 10 zones per port and computes distance (haversine × 2 for the return trip)
  and fuel (km × L/km) itself, so you only export the grids.

```python
import json, numpy as np
from datetime import date, timedelta, datetime, timezone

lats = np.round(np.arange(3.125, 13.0, 0.25), 3)   # 40
lons = np.round(np.arange(76.125, 87.0, 0.25), 3)  # 44

def grid(a, land_mask):
    """a: (40, 44) array; land_mask: (40, 44) bool, True on land -> null"""
    a = np.round(a.astype(float), 3)
    return [[None if land_mask[i, j] or np.isnan(a[i, j]) else float(a[i, j])
             for j in range(len(lons))] for i in range(len(lats))]

issued = date.today()
out = {
    "model_name": "C2 ConvLSTM (catch-conditioned)",
    "model_version": "0.3",
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "issued_date": issued.isoformat(),
    "grid": {"lat": lats.tolist(), "lon": lons.tolist()},
    "leads": {
        str(k): {"date": (issued + timedelta(days=k - 1)).isoformat(),
                 "probability": grid(prob[k - 1], land),   # prob: (3, 40, 44) model output
                 "uncertainty": grid(unc[k - 1], land)}    # unc:  (3, 40, 44)
        for k in (1, 2, 3)
    },
}
with open("integration/model_outputs/c2/forecast.json", "w", encoding="utf-8") as f:
    json.dump(out, f)
```

---

## C3 – `reefs.json`

`classes` lists the benthic classes your model outputs; each month's `cover` gives the percent per
class (the chart draws one line per class, so any class names work).

```json
{
  "model_name": "C3 Random Forest benthic classifier (Sentinel-2)",
  "model_version": "0.5",
  "generated_at": "2026-10-21T00:30:00Z",
  "classes": ["Coral", "Algae", "Other"],
  "reefs": [
    {"id": "hikkaduwa", "name": "Hikkaduwa National Park", "region": "Galle", "lon": 80.093, "lat": 6.139,
     "status": "at_risk", "change_12m": -2.1,
     "monthly": [
       {"month": "2026-08", "cover": {"Coral": 13.0, "Algae": 32.1, "Other": 54.9}},
       {"month": "2026-09", "cover": {"Coral": 13.4, "Algae": 30.2, "Other": 56.4}}
     ]}
  ]
}
```

- `status`: `good` | `watch` | `at_risk` (your rule, e.g. coral cover and its 12-month change).
- `change_12m`: change in coral cover over 12 months, in percentage points.
- Name a class exactly `"Coral"` so the dashboard can show mean coral cover.

```python
import json, pandas as pd
from datetime import datetime, timezone

# cover_df columns: reef_id, month (YYYY-MM), class, cover_pct
reefs = []
for reef in reef_info.itertuples():                      # id, name, region, lon, lat, status, change_12m
    rows = cover_df[cover_df.reef_id == reef.id]
    monthly = [{"month": m, "cover": {c: round(float(v), 1) for c, v in zip(g["class"], g.cover_pct)}}
               for m, g in rows.groupby("month")]
    reefs.append({"id": reef.id, "name": reef.name, "region": reef.region, "lon": float(reef.lon),
                  "lat": float(reef.lat), "status": reef.status, "change_12m": float(reef.change_12m),
                  "monthly": monthly})

out = {"model_name": "C3 Random Forest benthic classifier (Sentinel-2)", "model_version": "0.5",
       "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
       "classes": sorted(cover_df["class"].unique()), "reefs": reefs}
with open("integration/model_outputs/c3/reefs.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
```

---

## C4 – `spills.json`

```json
{
  "model_name": "C4 U-Net slick detector + AIS attribution",
  "model_version": "0.2",
  "generated_at": "2026-10-21T00:30:00Z",
  "spills": [
    {"id": "S1-20261020-01", "location_name": "West of Colombo port", "lon": 79.72, "lat": 6.93,
     "detected_at": "2026-10-20T00:52:00Z", "sensor": "Sentinel-1", "area_km2": 6.8, "confidence": 0.86,
     "severity": "high", "status": "active",
     "polygon": [[79.70, 6.90], [79.74, 6.91], [79.75, 6.96], [79.71, 6.95], [79.70, 6.90]],
     "candidates": [
       {"rank": 1, "vessel_id": "370118220", "vessel_name": "MT Indigo Star", "score": 0.78,
        "evidence": ["AIS track crossed the slick 2 h 40 min before the image", "Course aligned with slick axis"]}
     ]}
  ]
}
```

- `polygon`: the slick outline as a closed ring of `[lon, lat]` points (first point = last point).
- `status`: `active` | `resolved`. `severity`: `low` | `medium` | `high`.
- Candidates are always shown as **"candidate, not proof"**. `score` 0–1 is a ranking aid.

```python
import json
from datetime import datetime, timezone
from shapely.geometry import mapping

spills = []
for s in detections.itertuples():                        # your detections table / GeoDataFrame (EPSG:4326)
    ring = [[round(x, 5), round(y, 5)] for x, y in mapping(s.geometry)["coordinates"][0]]
    spills.append({
        "id": s.id, "location_name": s.location_name, "lon": float(s.geometry.centroid.x),
        "lat": float(s.geometry.centroid.y), "detected_at": s.time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sensor": "Sentinel-1", "area_km2": round(float(s.area_km2), 2), "confidence": round(float(s.prob), 2),
        "severity": s.severity, "status": s.status, "polygon": ring,
        "candidates": [{"rank": i + 1, "vessel_id": str(c["mmsi"]), "vessel_name": c["name"],
                        "score": round(float(c["score"]), 2), "evidence": c["evidence"]}
                       for i, c in enumerate(s.candidates)],
    })

out = {"model_name": "C4 U-Net slick detector + AIS attribution", "model_version": "0.2",
       "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "spills": spills}
with open("integration/model_outputs/c4/spills.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
```

---

## Live model runs ("Try the model")

### C4 – upload a SAR image → Detect

The C4 page has an upload box and a **Detect** button (`POST /api/c4/detect`). The API runs the
C4 member's own pipeline from `models/C4_oil_spill/` (it is imported, never changed):

1. speckle filter → 2. dark-spot mask → 3. clean-up → 4. patches (`c4_utils.detect`)
5. 19 features per patch (`c4_features.patch_features`)
6. **oil vs look-alike** with the trained classifier

Step 6 needs the trained model. Copy it from the C4 member's Drive (`MODEL_DIR` in
`C4_04_train_models.ipynb` / `C4_04b_tuning.ipynb`) into:

```
data/external/c4/
  <model>.joblib       ← the trained classifier (the tuned one if there is one; names with "tuned" or "best" are preferred)
  <meta>.json          ← optional: {"features": [...], "threshold": 0.xx} saved next to the model
```

- `data/` is gitignored, so the model file stays on this computer.
- Without a model file, steps 1–5 still run and every patch is shown as "dark spot".
- Use the **same scikit-learn version** as in Colab (`import sklearn; sklearn.__version__`), otherwise
  the model file may not load. If it needs another package (e.g. `imbalanced-learn`), install it with pip.
- Good demo images: Sentinel-1 VV crops (PNG/JPG/GeoTIFF, up to 4000 px) with and without oil.

### C1 – check a vessel track → Analyse

`POST /api/c1/analyse` runs the trained C1 engine with the C1 member's own code from
`models/C1_vessel_anomaly/` (`features.py`, `model.py`, `type_features.py`, `inject.py`):
clean → features → 10-ping windows → time-decay GRU autoencoder + AIS-gap rule → threshold → type.
Users pick an example track or upload a CSV (`time, lat, lon, sog, cog`, optional `mmsi`) and can
inject a test anomaly (spoofing, gap, slowdown, zigzag) to show the model catching it.

```
data/external/c1/results_colab_v2/      ← a results folder from run_c1.py (+ train_type_classifier.py)
  model.pt  scaler.json  score_scale.json  run_info.json      (required)
  type_clf.joblib  metrics.json  test_tracks.csv              (optional: types, test scores, examples)
```

### C2 – compare a forecast with what really happened

`GET /api/c2/replay?date=2025-06-14&model=ensemble` shows the C2 model's **saved 2025 test
forecast** (calibrated, MC dropout) for that day, its uncertainty, and the real fishing that day,
with ROC-AUC / PR-AUC / top-10% capture per lead day. Nothing is re-run; these are the notebook's numbers.

```
data/external/c2/                       ← from MyDrive/C2_data
  datacube_0p25.nc                      (dates, land mask, actual fishing)
  results/convlstm_test_predictions.npz  convgru_…  unet_…  ensemble_test_predictions.npz
  results/best_model.txt                (optional)
```

### C3 – reef health by location

`GET /api/c3/sites` and `GET /api/c3/sites/HKD`: choose a reef (Hikkaduwa, Pigeon Island …) and see its
habitat map, benthic cover, agreement with the Allen Coral Atlas and heat stress. For each site:

1. **Live model run** if a Sentinel-2 composite is present: `models/C3_reef_health/best_model.joblib`
   with the pre-processing copied from the C3 demo `models/C3_reef_health/app.py`.
2. Otherwise the **saved C3 results** in `models/C3_reef_health/results/`
   (`benthic_cover.csv`, `map_<SITE>.png`, `map_agreement.csv`), which are already in the repo.
3. **Heat stress** (NOAA Coral Reef Watch Degree Heating Weeks, alert levels 4 and 8) when a DHW file is present.

```
data/external/c3/                       ← from MyDrive/coral_c3 (all optional)
  S2_HKD_composite_v2.tif  S2_PGI_composite_v2.tif     (live model run; trained on v2 composites)
  ACA_HKD_label_v2.tif     ACA_PGI_label_v2.tif        (limits the live map to the reef area)
  dhw_HKD.csv              dhw_PGI.csv                 (columns: time, CRW_DHW)
```
New sites appear automatically when their `S2_<SITE>_composite*.tif` or `dhw_<SITE>.csv` is added
(add the name and coordinates to `SITES` in `integration/api/app/inference/c3.py`).
If C3 changes `app.py`'s pre-processing, update `integration/api/app/inference/c3.py` to match.
