## What this PR changes

<!-- One or two sentences. Start the title with your component, e.g. "C2: add top zones table". -->

Component: C1 / C2 / C3 / C4 / Shared

## Checklist

- [ ] I only changed my own files (`frontend/src/pages/cX/`, `api/cX.ts`, `types/cX.ts`, `integration/api/app/{routers,schemas,adapters}/cX.py`, `integration/model_outputs/cX/`), **or** this is a shared change and all members are asked to review
- [ ] Uses the shared components in `frontend/src/components/` and colours from `src/theme.ts` (no new colours, no inline styles)
- [ ] Page shows loading, error and "no data yet" states (it uses `ComponentPage`)
- [ ] Works at 375px width with no horizontal scroll
- [ ] `types/cX.ts` still matches `schemas/cX.py`; my model JSON follows `integration/MODEL_OUTPUTS.md`
- [ ] `npm run typecheck && npm run lint && npm run build` pass in `frontend/`
- [ ] The API starts (`uvicorn app.main:app --reload`) and my `/api/cX/data` works in `/docs`

## Screenshots

| Desktop | Phone (375px) |
| ------- | ------------- |
|         |               |
