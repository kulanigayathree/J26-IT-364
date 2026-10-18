# C3 – Satellite-Derived Reef Health Monitoring

**Owner:** Adikaram W.M.T.P

## What this module shows

- `/c3`: map of monitored reefs coloured by status, summary tiles and a sortable reef table.
- `/c3/:reefId`: monthly benthic-cover time series (coral, algae, sand/rubble; gaps = no
  cloud-free image) with a data table, a location map, and a heat-stress comparison (DHW this
  year vs last year, with 4 and 8 DHW alert lines).

All pages use the shared app shell, `PageHeader`, `AsyncView` (loading / empty / error) and a
`Disclaimer`.

## Files

| File          | Purpose                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `manifest.ts` | Title, icon, route, owner, map colour. The nav is built from it.                               |
| `routes.tsx`  | This module's pages (relative to `/c3`).                                                       |
| `api.ts`      | Typed loaders. Call only `fetchData()` from `@/lib/apiClient`.                                 |
| `types.ts`    | Mirrors `integration/api/app/schemas/c3.py`. Keep both in sync.                                |
| `mock/`       | Sample data (`reefs.json`, `reef_details.json`). Same files as `integration/api/app/mock/c3/`. |
| `components/` | Pages and pieces built from `@/components/ui` and `@/components/map`.                          |

## API

| Endpoint                      | Response type                     |
| ----------------------------- | --------------------------------- |
| `GET /api/c3/reefs`           | `Reefs` (Point FeatureCollection) |
| `GET /api/c3/reefs/{reef_id}` | `ReefDetail`                      |

## Run it

```bash
cd frontend && npm install && npm run dev          # http://localhost:5173/c3
cd integration/api && uvicorn app.main:app --reload # optional: real API at :8000
```

Without the API the page uses `mock/` and shows "Sample data". Check the states with
`?demo=loading`, `?demo=empty` and `?demo=error`.

## Next steps

- Replace the mock in `integration/api/app/routers/c3.py` with monthly classifier results from PostGIS.
- Add reef polygons instead of points when the outlines are ready (`GeoJSONLayer` handles both).
- Only edit this folder plus `routers/c3.py`, `schemas/c3.py` and `mock/c3/`. Need a shared
  component? See `frontend/CONTRIBUTING.md`.
