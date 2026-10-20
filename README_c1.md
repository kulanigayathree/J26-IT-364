# Component 1: Vessel Behavior Anomaly Detection

## 1. Overview
This component focuses on identifying and analyzing anomalous vessel behavior within the Sri Lankan Exclusive Economic Zone (EEZ). By leveraging historical and real-time Automatic Identification System (AIS) trajectory data, the system detects suspicious maritime activities such as illicit course deviations, loitering, unexpected speed variations, and unauthorized zone incursions.

## 2. Research Objectives
- **Data Ingestion & Preprocessing:** Clean, filter, and normalize high-density AIS trajectory datasets (MMSI, coordinates, SOG, COG, heading, timestamp).
- **Spatial Filtering:** Constrain maritime observations to Sri Lanka's maritime boundaries using custom EEZ geospatial polygons (`sri_lanka_eez.geojson`).
- **Feature Engineering:** Extract spatial-temporal motion characteristics including turn rate, kinematic states, acceleration, and track curvature.
- **Anomaly Detection Modeling:** Implement trajectory-based anomaly detection algorithms to flag abnormal navigational patterns.
- **Evaluation & Benchmarking:** Assess model performance against verified maritime scenarios and known historical patterns.

## 3. Data Sources
- `data/raw/marinecadastre_2025.csv`: Raw AIS telemetry records containing vessel dynamics.
- `data/raw/trawlers.csv`: Vessel registry metadata focusing on commercial fishing and specialized craft.
- `data/raw/sri_lanka_eez.geojson`: Geospatial polygon defining the maritime boundaries of the Sri Lankan EEZ.