# C1 – Vessel Behaviour Anomaly Detection

**Owner:** Pathirana K.G.T.K.S

## What this module shows

- `/c1`: map of AIS vessel tracks with anomaly markers coloured by severity, a type filter, and an
  alert table (score, severity, type, vessel, location, time). Selecting a row highlights the
  marker and opens the alert details.

All pages use the shared app shell, `PageHeader`, `AsyncView` (loading / empty / error) and a
`Disclaimer`.

## Files

| File          | Purpose                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `manifest.ts` | Title, icon, route, owner, map colour. The nav is built from it.                             |
| `routes.tsx`  | This module's pages (relative to `/c1`).                                                     |
| `api.ts`      | Typed loaders. Call only `fetchData()` from `@/lib/apiClient`.                               |
| `types.ts`    | Mirrors `integration/api/app/schemas/c1.py`. Keep both in sync.                              |
| `mock/`       | Sample data (`tracks.json`, `anomalies.json`). Same files as `integration/api/app/mock/c1/`. |
| `components/` | Pages and pieces built from `@/components/ui` and `@/components/map`.                        |

## API

| Endpoint                                                | Response type                                 |
| ------------------------------------------------------- | --------------------------------------------- |
| `GET /api/c1/tracks`                                    | `VesselTracks` (LineString FeatureCollection) |
| `GET /api/c1/anomalies?since=&min_score=&anomaly_type=` | `Anomalies` (Point FeatureCollection)         |

## Run it

```bash
cd frontend && npm install && npm run dev          # http://localhost:5173/c1
cd integration/api && uvicorn app.main:app --reload # optional: real API at :8000
```

Without the API the page uses `mock/` and shows "Sample data". Check the states with
`?demo=loading`, `?demo=empty` and `?demo=error`.

## Next steps

- Replace the mock in `integration/api/app/routers/c1.py` with the anomaly model output from PostGIS.
- Add SAR detection footprints as a second layer if needed (use `GeoJSONLayer` + `mapStyles`).
- Only edit this folder plus `routers/c1.py`, `schemas/c1.py` and `mock/c1/`. Need a shared
  component? See `frontend/CONTRIBUTING.md`.
