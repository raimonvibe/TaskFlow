# Next Steps

Updated 2026-08-07 after Option A (refresh-token rotation) landed on `main`
(`22c07b6`). Earlier sections of this document described work that is now
done; they are summarized below so a new session does not re-open closed
items. The remaining strategic project is Option B.

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
| 3B. Frontend Phase 1–7 treatment | **Still open** | See below |

Baseline after this pass: backend **268 tests / 35 files**, frontend **33 / 6**
(auth client, interceptor, and Tasks slice tests).

Windows note: `npm test` in `app/backend` uses `NODE_ENV=test …` (Unix). On
PowerShell run `$env:NODE_ENV='test'; npx vitest run --coverage` instead.

---

## Remaining: Option B — frontend Phase 1–7 treatment

The frontend is the part the backend rewrite deliberately never touched
(`BACKEND_REWRITE_PLAN.md` §8), and it shows:

- Plain JSX throughout, no TypeScript, while the backend is TypeScript end to
  end with `strict: true`. (`@types/react` is already a devDependency; there
  is no `tsconfig` and no `.ts`/`.tsx` under `src/`.)
- **4 test files** against the backend's 35.
- No layering: `Tasks.jsx` holds fetching, mutation, modal state and error
  handling together, and still reports some failures with `alert()`.

Symmetric with what was already done on the backend, bigger, and more visible
in a portfolio. Tooling already present: Vitest, Testing Library, jsdom,
ESLint, Prettier, Vite.

### Suggested phasing (mirror the backend plan, keep the app green)

1. **Toolchain** — **done.** `typescript`, `tsconfig.json` (`allowJs` +
   `strict`), `npm run typecheck`, and CI typecheck for the frontend. 
   `Tasks.jsx` no longer uses `alert()` for save/delete/status failures
   (same inline `error` banner as load failures).
2. **Auth client vertical slice** — **done.** `utils/security`, `api/axios`,
   `api/auth`, `api/types`, `config`, and `contexts/AuthContext` are
   TypeScript; ESLint understands `.ts`/`.tsx`. Tests cover
   `secureStorage` TTL, `authAPI.refresh`, and the real axios
   401→refresh→retry interceptor (fake adapter, no network).
3. **Tasks vertical slice** — **done.** `api/tasks`, `TaskCard`,
   `TaskModal`, and `pages/Tasks` are TypeScript; list/mutate logic lives
   in `hooks/useTasks.ts` so the page is mostly composition.
4. **Rest of UI** — **done.** Entire `src/` is TypeScript; `allowJs`
   removed from `tsconfig.json`.
5. **Coverage floor** — same ratchet as the backend, after the new tests
   land. Still open.

Do not start a big-bang rename. One slice green at a time, the way §7
sequenced the backend.

### Why this is next

Option A closed the security gap. What is left that the rewrite plan called
out is pedagogical / portfolio: bring the frontend up to the same standard.
If a smaller errand appears (docs drift, a real bug), do that first.
