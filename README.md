# J26-IT-364

An integrated marine monitoring system built from four machine learning components that share a common data pipeline, geospatial database and frontend.

## Components

| ID | Component | Purpose |
|----|-----------|---------|
| C1 | Vessel Anomaly Detection | Detect unusual vessel behaviour from tracking data |
| C2 | Fishing Zone Prediction | Predict likely fishing zones from ocean and environmental data |
| C3 | Reef Health Assessment | Assess and monitor coral reef health |
| C4 | Oil Spill Detection | Detect and map oil spills |

The results from each component are served through a shared API (FastAPI) to the web app. Model outputs are file-based for now (`integration/model_outputs/`); user accounts are stored in SQLite.

## Project Structure

```
├── data/
│   ├── raw/             # Original, unmodified datasets (not committed)
│   ├── processed/       # Cleaned data ready for modelling
│   └── external/        # Third-party reference data
│
├── shared/              # Code used by all components
│   ├── config/          # Configuration and settings
│   ├── utils/           # General helper functions
│   ├── preprocessing/   # Common data cleaning and transformation
│   ├── geospatial/      # Spatial processing helpers
│   └── database/        # Database connection and queries
│
├── models/              # One folder per component
│   ├── C1_vessel_anomaly/
│   ├── C2_fishing_zone/
│   ├── C3_reef_health/
│   └── C4_oil_spill/
│
├── integration/
│   ├── api/             # Backend API that serves model results
│   ├── postgis/         # Reserved for a future PostGIS database (not used yet)
│   └── output/          # Generated outputs (maps, reports, exports)
│
├── frontend/            # User interface
├── notebooks/           # Exploration and experiments
├── tests/               # Automated tests
└── docs/
    ├── architecture/    # System design documents and diagrams
    ├── research/        # Research papers and notes
    └── datasets/        # Dataset descriptions and sources
```

## Getting Started

### Prerequisites

- Python 3.10 or newer
- Node.js 20 or newer (for the web app)
- Git

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd J26-IT-364

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Run the app

The web app (React + Vite) lives in `frontend/`, the API (FastAPI) in `integration/api/`.
Start the API first, then the frontend in a second terminal.

```bash
# API: http://localhost:8000/docs
cd integration/api && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend (Node 20+): http://localhost:5173
cd frontend && npm install && npm run dev
```

Open http://localhost:5173, register an account and log in. User accounts are stored in
`integration/api/app.db` (SQLite, created on first run, not committed).

Each model's results come from a JSON file in `integration/model_outputs/cX/`. Until a member adds
their file, the app shows sample data with a "Sample data" badge. See
[integration/MODEL_OUTPUTS.md](integration/MODEL_OUTPUTS.md) for the formats and export snippets.

Before a PR run `npm run typecheck && npm run lint && npm run build` in `frontend/`.

## Working on the Project

- Put code shared by more than one component in `shared/`, not inside a component's folder.
- Keep each component's model code inside its own folder under `models/`.
- Don't commit large datasets. Store them in `data/raw/` locally and describe where they came from in `docs/datasets/`.
- Use `notebooks/` for experiments. When code in a notebook works, move it into `shared/` or `models/`.

## Team

| Member | IT Number | Component |
|--------|-----------|-----------|
| Pathirana K.G.T.K.S | IT23135352 | C1 – Vessel Anomaly Detection |
| Gayathree M.G.K | IT23334106 | C2 – Fishing Zone Prediction |
| Adikaram W.M.T.P | IT23329010 | C3 – Reef Health Assessment |
| Jayasundara K.H.W.M.G.M | IT23194694 | C4 – Oil Spill Detection |
