# C3 – Coral Reef Health Monitoring (Sentinel-2)

Satellite-based benthic habitat classification for Sri Lankan coral reefs:
Hikkaduwa (south-west coast) and Pigeon Island / Nilaveli (east coast).

## Data sources
| Data | Use | Access |
|---|---|---|
| Sentinel-2 L2A (`COPERNICUS/S2_SR_HARMONIZED`) | Model input (B2, B3, B4, B8, B11) | Google Earth Engine |
| Cloud Score+ | Cloud / shadow masking | Google Earth Engine |
| Allen Coral Atlas v2.0 (`ACA/reef_habitat/v2_0`) | Reference benthic labels | Google Earth Engine |
| NOAA Coral Reef Watch DHW (5 km) | Thermal stress validation | NOAA ERDDAP |

## Files
| Path | Description |
|---|---|
| `notebooks/C3_Day1_Data_Preparation.ipynb` | GEE: cloud-masked composites, ACA labels 5 m → 10 m, training samples, DHW |
| `notebooks/C3_Day2_Model_Training.ipynb` | Cleaning, sunglint correction, RF / SVM / XGBoost, spatial CV, maps |
| `models/C3_reef_health/app.py` | Streamlit demo (PP1) |
| `models/C3_reef_health/best_model.joblib` | Trained best model (from Day 2) |
| `models/C3_reef_health/results/` | Metrics (CSV) and figures (PNG) |

Raw rasters (`*.tif`) are not committed. They are in Google Drive `MyDrive/coral_c3`.

## Pipeline (PP1)
1. Sentinel-2 L2A → Cloud Score+ mask → clear-season median composite → NDWI land mask
2. ACA benthic labels resampled 5 m → 10 m (mode); stratified sampling (300 per class per site, 2,424 samples)
3. Cleaning (rare classes, bright outliers), Hedley sunglint correction, log band ratios
4. Random Forest, SVM, XGBoost × 3 feature sets, 5-fold spatial (block) cross-validation
5. Best model → classified benthic maps + cover %, Streamlit demo

## Run the demo (from the repository root)
```
python -m venv venv
venv\Scripts\activate
pip install -r models/C3_reef_health/requirements.txt
streamlit run models/C3_reef_health/app.py
```
Local files needed next to `app.py`:
- `best_model.joblib`
- `data/` → `S2_HKD_composite.tif`, `S2_PGI_composite.tif`, `ACA_HKD_label.tif`, `ACA_PGI_label.tif`, `dhw_HKD.csv`, `dhw_PGI.csv`
- `results/` → `model_comparison.csv`, `ablation_results.csv`, PNG figures (optional)

Outputs are satellite-derived indicators, not confirmed ecological health assessments.
