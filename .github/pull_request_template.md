## What this PR changes

<!-- One or two sentences. Start the title with your component, e.g. "C2: add forecast map". -->

Component: C1 / C2 / C3 / C4 / Shared

## Checklist

- [ ] I only changed my own folders (`frontend/src/features/cX-…/`, `integration/api/app/routers/cX.py`, `integration/api/app/schemas/cX.py`, `integration/api/app/mock/cX/`), **or** this is a shared change and all members are asked to review
- [ ] Uses shared components only (`@/components/ui`, `@/components/map`, `@/layout`); no private copies of shared components
- [ ] No new colours, fonts or sizes: everything comes from `src/design/tokens.ts`; no inline `style={{}}`
- [ ] Works at 375px width with no horizontal scroll
- [ ] Loading, empty and error states use the shared components (`AsyncView`, `?demo=loading|empty|error`)
- [ ] `types.ts` and the Pydantic schema still match
- [ ] `npm run lint && npm run typecheck && npm run build` pass in `frontend/`
- [ ] API starts (`uvicorn app.main:app --reload`) and `pytest` passes in `integration/api/` (if the API changed)

## Screenshots

| Desktop (1440px) | Mobile (375px) |
| ---------------- | -------------- |
|                  |                |

<!-- Add loading / empty / error screenshots for new pages. -->
