# Contributing to the Ocean AI app

The app looks like **one** product because everyone builds from the same parts. The structure
and the linter enforce that, so read this page once before you start.

## a) Branches and commits

- Branch from `development`: `feature/c1-<topic>`, `feature/c2-<topic>`, `feature/c3-<topic>`,
  `feature/c4-<topic>` (e.g. `feature/c2-forecast-map`). Shared work: `feature/shared-<topic>`.
- Commit messages start with your component: `C2: add forecast map`, `C4: rank candidate vessels`.
  Shared changes: `Shared: add Slider component`.
- Small commits, one idea each. Open a PR to `development` and fill in the PR checklist.

## b) What you edit

| You own (edit freely)               | Shared (ask first, all members review)                      |
| ----------------------------------- | ----------------------------------------------------------- |
| `frontend/src/features/cX-…/`       | `frontend/src/design/` (tokens)                             |
| `integration/api/app/routers/cX.py` | `frontend/src/components/` (UI and map kit)                 |
| `integration/api/app/schemas/cX.py` | `frontend/src/layout/`, `src/app/`, `src/pages/`            |
| `integration/api/app/mock/cX/`      | `frontend/src/features/registry.ts`                         |
| `models/CX_…/`                      | `integration/api/app/main.py`, `core/`, `schemas/common.py` |

Your feature folder contains exactly: `manifest.ts`, `routes.tsx`, `api.ts`, `types.ts`, `mock/`,
`components/`, `README.md`. The navigation, routes and Overview page are generated from
`manifest.ts` and `registry.ts`, so never hand-edit the nav.

The linter (`npm run lint`) blocks:

- imports from another feature folder, `src/pages` or `src/app` (features import only from
  `@/components`, `@/design`, `@/lib`, `@/layout` and their own folder);
- inline `style={{}}`, raw hex/rgb colours, and Tailwind arbitrary values like `p-[13px]`;
- other UI libraries (MUI, Bootstrap, …).

Rules for every page:

- Start with `<PageHeader>`, end with a `<Disclaimer>` that states the limits of the data.
- Wrap anything that loads data in `<AsyncView>`; it gives the shared loading, empty and error
  states. Add `?demo=loading`, `?demo=empty` or `?demo=error` to the URL to check them.
- Load data only through `fetchData()` in your `api.ts`, with a `mock` loader, so the page works
  without the API. Keep `types.ts` identical to your Pydantic schema.
- Check it at 375px (phone), 768px and 1440px with no horizontal scroll.
- Use `mapStyles` for map layers and `chartTheme` for charts. Show severity with `SeverityBadge`
  (word + icon, never colour alone).

## c) Need a new shared component or token?

Do **not** build a private copy in your folder. Instead:

1. Check `/styleguide` (run the app) — it may already exist.
2. Open a GitHub issue titled `Shared: <component>` with a sketch and where you need it.
3. The change goes in a separate PR to `src/components/ui` (or `src/design/tokens.ts`), with an
   example on `/styleguide`, reviewed by all members. Then use it from your feature.

## d) Run it locally

Frontend (Node 20+):

```bash
cd frontend
npm install
cp .env.example .env.local      # optional; defaults work
npm run dev                     # http://localhost:5173
npm run lint && npm run typecheck && npm run build   # before every PR
npm run format                  # Prettier
```

API (Python 3.10+):

```bash
cd integration/api
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs
pytest
```

The frontend calls `VITE_API_BASE_URL` (default `http://localhost:8000`). With
`VITE_USE_MOCKS=true` (default in dev) it falls back to each feature's `mock/` data when the API
is not running, and shows a "Sample data" badge.
