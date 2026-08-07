# Next Steps

Written 2026-08-07, immediately after the migration gap was closed
(`14cca81`). This is a handoff document: it assumes no memory of the session
that produced it, and every claim in it was verified against the code rather
than carried over from an earlier plan.

Read `docs/BACKEND_REWRITE_PLAN.md` §10 for the surrounding context. That
document's §10 item 1 is now closed; items 2–4 are still open and two of them
appear below.

---

## Before you start: this machine could not run the tests

**Nothing below has been verified against a running database.** The last
session hit a wall here and it will block you too if you do not clear it
first.

- `app/backend/.env` does not exist.
- The local PostgreSQL 18 service is running on `localhost:5432` but rejects
  `postgres`/`postgres` — the default that `src/test/globalSetup.ts` and the
  READMEs assume — and rejects OS-level/SSPI auth.
- Docker Desktop is not running, so the Compose Postgres is not a fallback.

The failure mode is misleading: `globalSetup.ts` connects *before* any test
file is collected, so a bad password surfaces as **"No test files found"**
plus a `28P01` error, which reads like a broken suite rather than a missing
credential.

Fix that first — create `app/backend/.env` from `app/backend/.env.example`
with working credentials, or start the Compose Postgres:

```bash
docker compose up -d postgres
```

Then confirm the baseline is green before changing anything:

```bash
cd app/backend && npm ci && npm test
```

Expect **252 tests across 31 files**. If you get that, everything below is
safe to attempt.

### Then verify the commit that came before this document

`14cca81` made `app/database/schema.sql` idempotent and switched it from
"apply once, when `users` is missing" to "apply in full, on every boot". That
is the load-bearing claim of the whole change, and **it was verified by review
only — it has never been executed.** If it is wrong, every deploy fails at
`npm run db:init` and the app does not start.

The check is two runs against a scratch database. Both must be silent:

```bash
createdb schema_idempotency_check
psql -d schema_idempotency_check -f "app/database/schema.sql"
psql -d schema_idempotency_check -f "app/database/schema.sql"
dropdb schema_idempotency_check
```

The second run is the whole point. It exercises the two `DO` blocks wrapping
`CREATE TYPE` that swallow `duplicate_object` — the only statements in the
file that were not already re-appliable. A failure there means the guards are
wrong, and the fix belongs in `schema.sql`, not in the callers.

Note for PowerShell: this is a `bash` block. Windows PowerShell 5.1 has no
`&&`, which is why the commands are on separate lines here — run them one at
a time, or chain with `;`.

### Other environment traps, all real

- **Node 22 is pinned** (`engines: >=22.12.0`, `.nvmrc: 22`). The machine this
  was written on had Node 24 — above the floor, so it works, but not the
  pinned version. A shell defaulting to something *older* does not
  auto-switch, and Vitest then dies on a `styleText` import from rolldown,
  which again looks like a broken suite rather than a wrong runtime. Run
  `nvm use` from the repo root.
- **`npm run lint` does not check formatting.** ESLint and Prettier are
  separate here; a file can pass lint and still be unformatted. Run
  `npx prettier --check "src/**/*.ts"` separately. Phase 7 shipped four
  unformatted files before this was caught.
- **Line endings.** The working tree has CRLF, the repo stores LF, and
  `core.autocrlf=true` reconciles them at staging time. If `git status` ever
  shows the *entire* repo as modified, that is this and not real changes —
  `git diff --ignore-cr-at-eol` will show the truth. Do not commit a
  whole-repo line-ending churn.
- **`app/database/schema.sql` must stay idempotent.** It is applied in full on
  every boot now. See its header before editing it.

---

## 1. Creating a task without a due date is broken (do this first)

### The defect

Leave the date field empty in the UI, save, and you get
`400 Invalid date format` in an `alert()`. Creating a task without a due date
is impossible from the frontend. This is the app's primary action.

`docs/BACKEND_REWRITE_PLAN.md` Phase 4 found this and deliberately left it —
at the time, both possible fixes were out of scope (§8 froze the frontend,
§6 froze the wire format). Neither constraint applies now. It was re-verified
end to end on 2026-08-07 and is still live on `main`.

### The chain, verified

1. `app/frontend/src/components/TaskModal.jsx:9` — `emptyForm()` initializes
   `due_date: ''`.
2. `app/frontend/src/components/TaskModal.jsx:34` — `handleSubmit` calls
   `onSave(formData)` verbatim. No stripping of empty values.
3. `app/frontend/src/pages/Tasks.jsx:73` — `handleSaveTask` passes it straight
   to `tasksAPI.createTask(taskData)`. Still no stripping.
4. `app/backend/src/presentation/http/validators/taskValidators.ts:30` —
   `body('due_date').optional().isISO8601()`. **express-validator's bare
   `optional()` skips only `undefined`**, so `''` is treated as present and
   handed to `isISO8601()`, which rejects it.

### Why the fix belongs on the backend

`app/backend/src/application/services/TaskService.ts:195`, `parseDueDate`:

```ts
if (value === undefined || value === null || value === '') return null
```

The service layer *already* treats `''` as "no due date". The validator is
the only layer that disagrees with the rest of the stack — it rejects a value
its own service knows how to handle. Fixing the validator makes the boundary
agree with the domain; fixing the frontend would leave the API still rejecting
a reasonable request from any other client.

It is also a **strictly loosening** change: every request that was accepted
before is still accepted. No existing client breaks, so this is not a wire
format change in the sense §6 cared about.

### The change

In `app/backend/src/presentation/http/validators/taskValidators.ts`, both
occurrences — line 30 (`createTaskValidation`) and line 45
(`updateTaskValidation`):

```ts
// before
body('due_date').optional().isISO8601().withMessage('Invalid date format'),

// after
body('due_date')
  .optional({ values: 'falsy' })
  .isISO8601()
  .withMessage('Invalid date format'),
```

Add a comment saying *why* `falsy` rather than the default, or someone will
"tidy" it back: the frontend's date input yields `''` for empty, and
`TaskService.parseDueDate` already maps `''` to `null`.

Consider the same treatment for `description`, which has the same shape
(`body('description').optional().trim()` with `''` sent by the modal) — but
`.trim()` alone never rejects, so it is not currently a bug. Leave it unless
you want the consistency.

### The test that should have caught this

There is currently **no test anywhere that sends `due_date: ''`** — verified
by grep. That is precisely why this survived a 252-test suite. Do not fix the
bug without adding one, or it will regress.

Two levels, both worth having:

- **Unit**, in `src/application/services/TaskService.test.ts` — assert that
  creating with `dueDate: ''` yields a task with a null due date. This may
  already pass; that is the point, it documents the contract the validator
  was violating.
- **Integration**, exercising the real route through Express so the validator
  is actually in the path. The existing security suite under
  `src/test/security/` is the model for how these are written (real app, real
  Postgres, `supertest`). A unit test on `TaskService` alone cannot catch
  this, because the bug lives in middleware that never runs in a unit test —
  that is the whole lesson of this defect.

### Verify

```bash
cd app/backend
npm run typecheck && npm run lint && npm test
npx prettier --check "src/**/*.ts"
```

Then, by hand, with the app running: create a task with the date field left
empty. It should succeed and show no due date.

**Estimated effort: under an hour, most of it the integration test.**

---

## 2. Put a floor under coverage (ten minutes, do it in the same sitting)

`docs/BACKEND_REWRITE_PLAN.md` §10 item 2, still open.

`app/backend/vitest.config.js` has a `coverage` block but **no `thresholds`
key** — verified. Coverage is collected and reported and nothing enforces it,
so today's 93.9% statements / 81.9% branches can rot with CI staying green.

The weak spots are all error paths, which is both the usual shape and the
usual reason a regression there goes unnoticed: `PostgresConnection` 25%
branches, `JwtTokenProvider` 50%, `currentUser.ts` 66%.

Set the floor at roughly **what is already true**, not at an aspiration — so
it ratchets and blocks backsliding without demanding new tests today:

```js
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    statements: 93,
    branches: 81,
    functions: 90,   // measure first, then set
    lines: 93,
  },
  exclude: [ /* ...unchanged... */ ],
}
```

Run `npm test` first to read the actual current numbers, then set each floor
a point or two below it. Setting it *above* current reality just breaks CI on
the next commit for no reason.

Do this **after** item 1, so the new tests are counted in the baseline.

---

## 3. The strategic fork — pick one

Both are real projects. The recommendation is refresh-token rotation.

### Option A — Refresh-token rotation (recommended)

`docs/BACKEND_REWRITE_PLAN.md` §7 assessed this and declined to build it. Read
that entry before starting; the analysis is good and still applies. **Its
stated reason has now expired.** It was declined because it needed a
wire-format change, a frontend change, and a new table, all three out of
scope at the time. None of those constraints hold any more.

The substance, verified:

- `app/backend/src/infrastructure/config/Config.ts:93` — `JWT_EXPIRE` defaults
  to `'7d'`. `TokenService` independently caps token age at the same seven
  days.
- A stolen access token is therefore valid for a week, and the only
  revocation path is the `token_blacklist` table, which is written *only* on
  an explicit logout.

That is the weakest real security property the app has, and it is worth more
than any further restructuring of code that already works.

What it needs, per §7's own analysis:

1. A `refresh_tokens` table in `app/database/schema.sql` — **and it must be
   idempotent**, since that file is now applied on every boot. See §10 item 1
   in the rewrite plan for why there is no migration tool, and the schema
   file's header for the additive-only constraint. A new table is exactly the
   additive case this arrangement handles.
2. Login and register responses carry a second token. This *is* a deliberate
   wire-format change — the first one since §6 — so make it consciously.
3. Rotation with reuse detection: presenting an already-used refresh token
   should invalidate the whole family, not just fail.
4. Frontend: the axios 401 interceptor must attempt a refresh and retry
   instead of clearing the session and redirecting; `secureStorage` must hold
   a second credential.
5. Revisit `JWT_EXPIRE` while you are there — the point of rotation is that
   the access token gets *short*, so leaving it at `7d` would waste the work.

`JWT_REFRESH_SECRET` is already read into `Config.jwt.refreshSecret` and
provisioned in `render.yaml` and `.env.example.secure`, consumed by nothing.
It is a placeholder left in place for exactly this feature (§10 item 4), so
adopting it also closes that item.

**Do not build only the backend half.** §7 is explicit and correct about this:
an endpoint nothing calls is dead code that still has to be tested,
documented and kept working, and it adds a persisted long-lived credential to
the attack surface for no benefit until the frontend catches up.

### Option B — Give the frontend the Phase 1–7 treatment

The frontend is the part the rewrite deliberately never touched (§8), and it
shows:

- Plain JSX throughout, no TypeScript, while the backend is TypeScript end to
  end with `strict: true`.
- **4 test files** (`api/auth.test.js`, `api/tasks.test.js`,
  `components/StatCard.test.jsx`, `components/TaskCard.test.jsx`) against the
  backend's 31.
- No layering: `Tasks.jsx` holds fetching, mutation, modal state and error
  handling together, and reports failures with `alert()`.

Symmetric with what was already done, bigger, and more visible in a portfolio.
The tooling is already there — Vitest, Testing Library, jsdom, ESLint and
Prettier are all configured.

### Why A over B

The design analysis for A is already written and only needs executing;
B is restructuring code that currently works, which is lower value per hour
than closing a genuine security gap. And because A needs the axios
interceptor and `secureStorage` anyway, it pulls you into the frontend on a
concrete errand — which is a better way into that codebase than a rewrite
undertaken for its own sake.

If the goal is deliberately pedagogical rather than practical, B is the
defensible choice. Decide on that basis, not on effort.

---

## Also still open, deliberately not scheduled

From `docs/BACKEND_REWRITE_PLAN.md` §10:

- **Item 3 — `PostgresConnection.transaction()` has no production caller.**
  Only its own test exercises it. Not worth removing: it is correct, tested,
  and the obvious place to reach when something finally spans two statements.
  Just know it has never run in anger. Refresh-token rotation (Option A) is
  very likely its first real caller — issuing a new token while invalidating
  the old one is exactly a two-statement operation that must not half-apply.
- **Item 4 — `JWT_REFRESH_SECRET` is dead config.** Closed by Option A;
  remove it only if rotation is abandoned rather than deferred.

## One correction to carry forward

`docs/BACKEND_REWRITE_PLAN.md` §10 item 1 claimed "nothing in deployment
replays that directory." That was false — `infrastructure/hybrid/main.tf` fed
the stale migrations to a `supabase_migration` resource, in a combination that
could never have applied cleanly. It is fixed, but treat the lesson as
general: **that document's claims about what is and is not wired up were not
all true.** Verify before relying on one, the way this document verified every
line number it cites.
