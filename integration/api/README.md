# Ocean AI API

FastAPI service that serves the outputs of C1–C4 to the frontend. For now every endpoint returns
sample data from `app/mock/<component>/` (same files as the frontend's `mock/` folders), with a
`TODO(CX)` where the model / PostGIS call goes.

```bash
cd integration/api
python -m venv .venv && .venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload                    # http://localhost:8000/docs
pytest                                           # smoke tests for every endpoint
```

| Path | Owner | Router |
| --- | --- | --- |
| `/health` | shared | `app/main.py` |
| `/api/c1/...` | C1 | `app/routers/c1.py`, `app/schemas/c1.py` |
| `/api/c2/...` | C2 | `app/routers/c2.py`, `app/schemas/c2.py` |
| `/api/c3/...` | C3 | `app/routers/c3.py`, `app/schemas/c3.py` |
| `/api/c4/...` | C4 | `app/routers/c4.py`, `app/schemas/c4.py` |

Conventions (`app/schemas/common.py`): GeoJSON FeatureCollections for spatial outputs,
coordinates `[lon, lat]` in WGS84, timestamps ISO 8601 UTC with `Z`. Each schema mirrors the
frontend `features/<cX>/types.ts`.

CORS allows the Vite dev and preview servers by default. Set `CORS_ORIGINS` (comma-separated) to
change it.
