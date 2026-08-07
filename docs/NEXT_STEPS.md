# Next Steps

Updated 2026-08-07 after Option B (frontend TypeScript adoption) closed on
`main`. Earlier sections described work that is now done; they are
summarized below so a new session does not re-open closed items.

Read `docs/BACKEND_REWRITE_PLAN.md` §10 for surrounding context. That
document's §10 items 1–4 are all closed in code; update its prose if you
touch it so it stops claiming otherwise.

---

## Closed on this pass

| Item | Status | Commit / notes |
|------|--------|----------------|
| Before you start (local DB) | Cleared on the machine that ran the work | Compose Postgres on `5433` (local PG 18 owns `5432`); `app/backend/.env` from `.env.example` |
| Schema idempotency (`14cca81`) | Verified by two silent applies | Scratch DB check |
| 1. Empty `due_date: ''` → 400 | **Done** | Validator `optional({ values: 'falsy' })` + unit + integration tests |
| 2. Coverage thresholds | **Done** | `vitest.config.js`: statements 93 / branches 81 / functions 95 / lines 93 |
| 3A. Refresh-token rotation | **Done** | Schema + backend + frontend together; access JWT default `15m`; closes §10 items 3–4 |
| 3B. Frontend Phase 1–7 treatment | **Done** | Full `src/` is TypeScript; coverage floors in `vite.config.js` |

Baseline after this pass: backend **268 tests / 35 files**, frontend **33 / 6**
(auth client, interceptor, Tasks slice, StatCard).

Windows note: `npm test` in `app/backend` uses `NODE_ENV=test …` (Unix). On
PowerShell run `$env:NODE_ENV='test'; npx vitest run --coverage` instead.

---

## Closed: Option B — frontend Phase 1–7 treatment

Symmetric with the backend rewrite. Phases landed as:

1. **Toolchain** — `typescript` ~5.8, `tsconfig.json` (`strict`),
   `npm run typecheck`, CI typecheck; Tasks errors use an inline banner
   (no `alert()`).
2. **Auth client** — `utils/security`, `api/axios`, `api/auth`,
   `api/types`, `config`, `AuthContext`; refresh + 401 retry tests.
3. **Tasks slice** — `api/tasks`, `TaskCard`, `TaskModal`, `pages/Tasks`,
   `hooks/useTasks`.
4. **Rest of UI + Tour** — entire `src/` is TypeScript; `allowJs` removed.
5. **Coverage floor** — `vite.config.js` thresholds statements 76 /
   branches 60 / functions 88 / lines 76 (a point or two under the
   measured baseline). Raise when coverage grows.

## What is next

Option A and Option B from this handoff are closed. Prefer real bugs, docs
drift, or product features over reopening closed rewrite items. Raise
frontend coverage floors as new tests land (same ratchet as the backend).
