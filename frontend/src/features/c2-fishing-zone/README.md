# C2 – Catch-Conditioned Fishing-Zone Prediction

**Owner:** Gayathree M.G.K

## What this module shows

- `/c2`: forecast map (probability grid as coloured cells), lead-time selector (24/48/72 h),
  uncertainty layer toggle, harbour selector and a "Best zone" panel (lat/lon, distance, fuel).
- `/c2/fisher`: mobile-first fisher view: harbour selector, today's best zone, distance and
  direction, fuel estimate, confidence in plain words, large touch targets. The last result is
  kept on the phone (localStorage + service worker cache) for use without signal. The mobile tab
  bar opens this view (`mobileRoute` in `manifest.ts`).

All pages use the shared app shell, `PageHeader`, `AsyncView` (loading / empty / error) and a
`Disclaimer`.

## Files

| File          | Purpose                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.ts` | Title, icon, route, owner, map colour. The nav is built from it.                                                                                         |
| `routes.tsx`  | This module's pages (relative to `/c2`).                                                                                                                 |
| `api.ts`      | Typed loaders. Call only `fetchData()` from `@/lib/apiClient`.                                                                                           |
| `types.ts`    | Mirrors `integration/api/app/schemas/c2.py`. Keep both in sync.                                                                                          |
| `mock/`       | Sample data (`ports.json`, `forecast_24.json`, `forecast_48.json`, `forecast_72.json`, `best_zones.json`). Same files as `integration/api/app/mock/c2/`. |
| `components/` | Pages and pieces built from `@/components/ui` and `@/components/map`.                                                                                    |

## API

| Endpoint                                               | Response type                 |
| ------------------------------------------------------ | ----------------------------- |
| `GET /api/c2/ports`                                    | `Port[]`                      |
| `GET /api/c2/forecast?lead_time_h=24&port_id=negombo`  | `Forecast` (grid + best zone) |
| `GET /api/c2/best-zone?port_id=negombo&lead_time_h=24` | `BestZone`                    |

## Run it

```bash
cd frontend && npm install && npm run dev          # http://localhost:5173/c2
cd integration/api && uvicorn app.main:app --reload # optional: real API at :8000
```

Without the API the page uses `mock/` and shows "Sample data". Check the states with
`?demo=loading`, `?demo=empty` and `?demo=error`.

## Next steps

- Replace the mock in `integration/api/app/routers/c2.py` with the model run and the fuel-aware ranking.
- Calibrate `fuel_rate_l_per_km` per boat class with the fisher survey data.
- Only edit this folder plus `routers/c2.py`, `schemas/c2.py` and `mock/c2/`. Need a shared
  component? See `frontend/CONTRIBUTING.md`.
