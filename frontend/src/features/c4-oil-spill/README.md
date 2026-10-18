# C4 – Oil-Spill Detection and Vessel Attribution

**Owner:** Jayasundara K.H.W.M.G.M

## What this module shows

- `/c4`: date filter, map of detected slick polygons coloured by severity, and a spill alert table.
- `/c4/:spillId`: slick polygon with candidate vessel tracks, and ranked candidate vessels with
  their evidence. Every candidate is labelled **"Candidate, not proof"**.

All pages use the shared app shell, `PageHeader`, `AsyncView` (loading / empty / error) and a
`Disclaimer`.

## Files

| File          | Purpose                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `manifest.ts` | Title, icon, route, owner, map colour. The nav is built from it.                                 |
| `routes.tsx`  | This module's pages (relative to `/c4`).                                                         |
| `api.ts`      | Typed loaders. Call only `fetchData()` from `@/lib/apiClient`.                                   |
| `types.ts`    | Mirrors `integration/api/app/schemas/c4.py`. Keep both in sync.                                  |
| `mock/`       | Sample data (`spills.json`, `spill_details.json`). Same files as `integration/api/app/mock/c4/`. |
| `components/` | Pages and pieces built from `@/components/ui` and `@/components/map`.                            |

## API

| Endpoint                        | Response type                                       |
| ------------------------------- | --------------------------------------------------- |
| `GET /api/c4/spills?from=&to=`  | `Spills` (Polygon FeatureCollection)                |
| `GET /api/c4/spills/{spill_id}` | `SpillDetail` (slick, candidates, candidate tracks) |

## Run it

```bash
cd frontend && npm install && npm run dev          # http://localhost:5173/c4
cd integration/api && uvicorn app.main:app --reload # optional: real API at :8000
```

Without the API the page uses `mock/` and shows "Sample data". Check the states with
`?demo=loading`, `?demo=empty` and `?demo=error`.

## Next steps

- Replace the mock in `integration/api/app/routers/c4.py` with the SAR detector and attribution output.
- Keep the "Candidate, not proof" label and the `candidate` Disclaimer on every view of candidates.
- Only edit this folder plus `routers/c4.py`, `schemas/c4.py` and `mock/c4/`. Need a shared
  component? See `frontend/CONTRIBUTING.md`.
