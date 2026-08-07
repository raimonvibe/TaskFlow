# Backend Rewrite Plan: TypeScript, Clean Architecture, Design Patterns

Status: **Phase 5 (cross-cutting cleanup) done — `src/` is TypeScript end to end and no pre-rewrite file remains.** Next up: Phase 6 (docs & infra catch-up: `docs/ARCHITECTURE.md`, the DevOps Tour).

- *Phase 1 (toolchain & skeleton)*: TypeScript, tsx, and the `@types/*` packages are installed; `tsconfig.json`/`tsconfig.build.json` are in place (strict, NodeNext); ESLint understands `.ts` files; the five layer folders (`domain/`, `application/`, `infrastructure/`, `presentation/`, `composition/`) exist with marker files explaining what belongs in each; CI (`main.yml`, `pr-check.yml`) runs `npm run typecheck` for the backend.
- *Phase 2 (domain foundations)*: the `AppError` hierarchy (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `RateLimitedError`), the `Email` value object, `DomainEvent`, the `IClock`/`IEventBus`/`ILogger` ports with their `SystemClock`/`InMemoryEventBus`/`WinstonLogger` implementations, the validated `Config` class, and the `PostgresConnection` adapter — each with unit tests, and a `FixedClock` fake under `src/test/fakes/`.

Phases 1 and 2 changed nothing in `src/*.js`; Phase 3 is where the new code took over the auth endpoints and the old ones were deleted. `npm run typecheck`, `npm run lint`, `npm run build`, and the full test suite are green.

- *Phase 3 (auth vertical slice)*: **done and serving traffic.** `IUserRepository`/`PostgresUserRepository`, `ITokenBlacklistRepository`/Postgres impl, `BcryptPasswordHasher`, `JwtTokenProvider`, `TokenService`, `AuthService`, `AuthController`, auth routes/validators/DTOs, `authenticate` + `errorHandler` + `validateRequest` middleware, `MetricsSubscriber`/`AuditLogSubscriber`, and the composition root.

  Retired: `app.js`, `server.js`, `routes/authRoutes.js`, `controllers/authController.js` (+ test), `middleware/errorHandler.js` (+ test), `models/User.js` (+ test — replaced by `PostgresUserRepository.test.ts`; its unused `update`/`delete`/`findAll` were dead code and are simply gone).

- *Phase 4 (task vertical slice)*: **done and serving traffic.** `TaskStatus`/`TaskPriority` value objects, the `Task` entity, `ITaskRepository`/`PostgresTaskRepository`, `TaskEvents`, `TaskService`, `TaskController`, task routes/validators, `taskResponse` DTO, and the `buildAssignments` update helper. `MetricsSubscriber` and `AuditLogSubscriber` gained task subscriptions; `MetricsRegistry` gained the three task methods and `PrometheusMetricsRegistry` now wraps the `tasks_by_status` gauge as well as the `auth_attempts_total` counter. 197 tests across 24 files pass.

  Retired: `models/Task.js` (+ test — replaced by `PostgresTaskRepository.test.ts`), `controllers/taskController.js` (+ test — replaced by `TaskService.test.ts`), `routes/taskRoutes.js`, and, now that nothing imported them any more, `middleware/auth.js` (+ test), `middleware/validate.js`, and `models/TokenBlacklist.js`. The `LEGACY_PG_ERRORS` block in `errorHandler.ts` is gone too: every query in the app now runs inside a repository, so there is no Postgres error code left for the HTTP layer to recognize.

- *Phase 5 (cross-cutting cleanup)*: **done.** `src/` contains no `.js` at all. `HealthService` behind a new `DatabaseHealth` port, `HealthController` and `MetricsController`, `healthRoutes.ts`, and `requestLogger` as a middleware factory over the `Logger` and `HttpMetrics` ports. `PrometheusMetricsRegistry` now owns the prom-client Registry and every instrument, so it is the only file in the codebase that imports prom-client. `initSchema.ts` and `seed.ts` replaced their JavaScript originals and share a `composition/scriptContext.ts` root. The security suite, its helpers, and `globalSetup` are TypeScript. 216 tests across 27 files pass.

  Retired: `config/index.js` and `config/database.js` (replaced by `Config` and `PostgresConnection`, which existed since Phase 2 but had these two still shadowing them), `utils/logger.js`, `utils/metrics.js`, `middleware/requestLogger.js`, `routes/healthRoutes.js`, `database/init-schema.js`, `database/seed.js`, and `jest.config.js` (dead since the Vitest migration; its `testMatch` of `**/*.test.js` now provably matches nothing).

  `allowJs`/`checkJs` are gone from `tsconfig.json` — §7 assigned that to Phase 6, but its stated precondition ("once no `.js` remains under `src/`") is exactly what this phase establishes, and leaving the escape hatch open would let a stray `.js` file slip back in unchecked. `tsconfig.build.json` lost its `src/database/**/*.js` special case for the same reason: the scripts are `.ts` now, so the ordinary include covers them.

### What Phase 5 changed about how metrics are wired

`utils/metrics.js` built its Registry and instruments at import time and handed them out as module-level singletons that controllers and middleware incremented directly. The names, help strings, label names, and histogram buckets all survive unchanged, so `/metrics` exposes the same series and the Grafana dashboards keep working. Two things about the *arrangement* are different:

- **Instruments register only into their own Registry.** prom-client's default is to also add every instrument to a global default registry, where a second instance collides on the duplicate metric name. That collision is why the two `/metrics` gating tests were split across files in the first place, with a comment explaining that the Registry "doesn't tolerate being torn down and rebuilt more than once per process." Passing `registers: [registry]` explicitly removes the constraint; the tests stay in separate files now only because each needs its own `METRICS_KEY`.
- **Nothing above `infrastructure/metrics/` knows what a gauge is.** The ports (`MetricsRegistry`, `HttpMetrics`, `MetricsExporter`) speak in things that happened — a request finished, a task changed status — and the inc/dec/observe arithmetic lives in one file. That includes the pairing the `tasks_by_status` gauge depends on, which used to be an `if (status !== previousStatus)` inline in `taskController.js`.

The container now always constructs the metrics registry rather than taking it as an optional override, because `/metrics` is part of the app it builds. `main.ts` and `testApp.ts` both got shorter as a result.

### Behavior changes in Phase 5

None intended, and none found. `/health` returns the same body and the same 200/503 split; `/metrics` still answers 404 rather than 401 to a caller without `METRICS_KEY`, still sets the database pool gauge immediately before rendering, and still emits the same series. The one internal difference is that the health check runs `SELECT 1` instead of `SELECT NOW()` — the timestamp was never read.

### Verification performed at the Phase 5 cutover

Beyond lint/typecheck/build/tests: the compiled output was run against the real database and checked by hand for `/health` (200, `{status, timestamp, database}`), `/metrics` with no key (404), with a wrong key (404), and with the right key — confirming `http_requests_total`, `http_request_duration_seconds`, `active_connections`, `database_connections{state=...}`, `tasks_by_status`, `auth_attempts_total`, and the prom-client default process metrics are all present and moving. A failed login incremented `auth_attempts_total{status="failure"}`, which is the end-to-end proof that the always-on `MetricsSubscriber` is wired the same way the old override was. `npm run db:init` was run against the dev database and took its idempotent "already initialized, skipping" path, exiting cleanly without `process.exit` now that the script closes its own pool.

### Behavior changes in Phase 4, and why each one is not a regression

The rule was still "keep every endpoint's request/response JSON shape identical," and the success shapes are byte-for-byte what they were (verified by hand, see below). Four status codes changed, all of them cases that used to be a 500:

| Case | Before | After | Why |
|---|---|---|---|
| `PUT /api/tasks/:id` with a body containing no updatable field | 500 — `models/Task.js` threw a bare `Error('No valid fields to update')` | 400 `No fields to update` | The caller sent a request that cannot do anything. That is the caller's mistake, and a bare `Error` reaching the error middleware was never intentional. |
| `GET /api/tasks?status=<not a real status>` | 500 — the value was passed through to Postgres, which rejected the `task_status` enum cast | 400 `Invalid status` | Query filters are now validated at the boundary like every other input. The injection suite already tolerated either shape; it asserts only that no other user's rows come back. |
| A title longer than `VARCHAR(255)` | 500 — pg's `22001` reached the error middleware untranslated | 400, naming the field | Caught by a new `isLength({ max: 255 })` on the route, with `PostgresTaskRepository` translating `22001` as a backstop. |
| A foreign-key violation on a task write | 400 `Invalid reference` | 500 | This can only happen if the authenticated user's row vanished mid-request. That is a broken invariant, not something the client got wrong — the old 400 pointed the blame in the wrong direction. |

**Pre-existing bug found while migrating, deliberately left alone:** `TaskModal.jsx` sends `due_date: ''` when the date field is empty, and `body('due_date').optional()` in express-validator only skips `undefined`, so `''` reaches `isISO8601()` and fails. Creating a task without a due date from the UI therefore returns 400 `Invalid date format` — and did before this phase too. Fixing it means either changing the frontend (out of scope, §8) or loosening the validator to `optional({ values: 'falsy' })` (a wire-format change not called for by this plan), so the validator was carried over exactly as it was. `TaskService` already treats `''` as "no due date", so only the validator stands in the way. Worth raising as its own change.

### Verification performed at the Phase 4 cutover

Beyond lint/typecheck/build/tests: the server was run against the real database and driven by hand through register → create (full) → create (defaults) → create with a `user_id` in the body → list → filtered list → bogus filter → get → non-integer id → missing id → update with a status change → update clearing a description → empty update → invalid enum → over-long title → stats → unauthenticated request → the same read/update/delete as a second user → delete → delete again. Response bodies matched the pre-rewrite shapes field for field, including `user_id`/`due_date` snake_case and ISO timestamps.

The `tasks_by_status` gauge was checked on `/metrics` afterwards and had returned to the arithmetically correct values, which is the assertion that matters for the Observer refactor: the inc/dec pairing survived being moved out of the controller and into `PrometheusMetricsRegistry`.

### The ordering problem this phase surfaced

§7 sequenced the entrypoint and deployment work into Phase 6, and phases 3–5 as "vertical slices [that keep] the app deployable." Those two could not both hold. `app.js`/`server.js` were JavaScript, `npm start` was plain `node src/server.js`, and **Node cannot import a `.ts` file at runtime** — so no amount of new TypeScript could serve a request until the entrypoint itself became TypeScript. The entrypoint move was a *prerequisite* of Phase 3, not the Phase 6 catch-up task the plan assumed.

It was therefore done as part of Phase 3: `main.ts` + `presentation/http/app.ts`, `allowJs` so the TS entrypoint can keep importing the not-yet-migrated task/health routes, `dev`/`start`/`db:init` pointed at `tsx`/`dist/`, a Dockerfile build stage, a Dockerfile `dev` stage (compose bind-mounts the source, so it needs the dev dependencies for `tsx watch` — this is new hot reload the old `node src/server.js` container never had), and `render.yaml`'s `buildCommand`.

**Correction to §7 for the remaining phases:** the "docs & infra catch-up" phase no longer includes the entrypoint or the Dockerfile/render build wiring — that is done. What remains for Phase 6 is `docs/ARCHITECTURE.md` and the DevOps Tour content. (`allowJs`/`checkJs` were also listed here; Phase 5 removed them, since it is the phase that made no `.js` remain under `src/`.)

### §6's open question, now answered

The plan flagged that the error-envelope change should be "confirmed against the actual frontend call sites before cutover, not assuming." Confirmed: every error path in the frontend (`Login.jsx`, `Register.jsx`, `Tasks.jsx` ×3, `api/axios.js`) reads `err.response?.data?.message`, which both the old and new shapes provide. No frontend change is needed.

### Verification performed at the Phase 3 cutover

Beyond lint/typecheck/tests: the production image was built and run against the real database, and register → me → duplicate-register (409) → bad login (401) → tasks → logout → revoked-token (401) → validation-error shape were each checked by hand. That last sequence also confirms cross-slice compatibility — the still-JavaScript `/api/tasks` middleware accepts tokens minted by the new `JwtTokenProvider`, which is the thing that would have broken silently if the issuer/audience/algorithm claims had drifted.

**One-time local gotcha:** the compose backend keeps `node_modules` in an anonymous volume, which Docker reuses across image rebuilds. After pulling this change, the container will fail with `sh: tsx: not found` until the volume is renewed:

```bash
docker compose up -d --force-recreate -V backend
```

Decisions already made (see rationale inline below):
- **Scope**: backend only. Frontend (React) is untouched by this plan.
- **Breaking changes**: allowed, but used sparingly and always justified (see [Wire-format changes](#wire-format-changes-what-actually-breaks)).
- **Language**: migrate from plain JavaScript (ESM) to **TypeScript**.
- **Data access**: stay on raw SQL via `pg`, wrapped in the Repository pattern. No ORM.

---

## 1. Why rewrite, and why these patterns specifically

The current backend (`app/backend/src`) works and is reasonably well hardened (rate limiting, JWT blacklist, security headers, 119 passing tests as of this session). The problems aren't correctness — they're structural, and they show up as friction every time we touch the code:

| Symptom in the current code | Root cause | Pattern that fixes it |
|---|---|---|
| Every controller test needs `vi.mock('../config/database.js')`, `vi.mock('../models/User.js')`, etc. | Controllers import concrete modules (`query`, `User`, `Task`) directly — no seam to substitute a fake | **Dependency Injection** via constructor injection + a composition root |
| `errorHandler.js` checks `err.code === '23505'` (Postgres's own wire-protocol error code) | Raw Postgres errors leak all the way up to the generic HTTP error middleware | **Repository pattern** — the repository catches driver errors and throws domain errors (`ConflictError`, etc.) |
| `authController.js` mixes `req`/`res` handling with "does this user already exist," token generation, metrics, and logging | No service layer — business logic lives in the HTTP layer | **Service layer** (application use-cases), thin controllers |
| `authAttempts.inc({type:'login', status:'failure'})` and `logger.info('User logged in', ...)` calls hardcoded inline, several places | Controllers are coupled directly to prom-client and Winston | **Observer pattern** — domain events (`UserAuthenticatedEvent`) + subscribers (`MetricsSubscriber`, `AuditLogSubscriber`) |
| `User.update`/`Task.update` each hand-roll a `paramCount` counter and an `allowedFields.includes()` whitelist | No shared, testable way to build a dynamic `UPDATE` | Small internal **query-builder helper** inside the repository layer |
| `token_blacklist` existed in `init-schema.js` but not `schema.sql` — CI's real migration path never created it (found and fixed this session) | Schema exists in two places that can silently drift | Real migration files as the *only* source of truth (`node-pg-migrate`, already a devDependency, currently unused for what's shipped) |
| `'todo' \| 'in_progress' \| 'completed'` and `'low' \| 'medium' \| 'high'` typed as raw strings everywhere | No single place owning "what's a valid status" | **Value objects** (`TaskStatus`, `TaskPriority`) |
| `config/index.js` validates `JWT_SECRET` inside an IIFE buried in an object literal | Config is a plain object, not a validated unit | **Singleton** `Config` class with an explicit `validate()` step, fail-fast at boot |
| Error response shape is inconsistent: authController sends `{message}`, `validate.js` sends `{status:'error', message, errors:[...]}`, errorHandler sends `{status:'error', message}` | No shared error hierarchy — every code path invents its own envelope | `AppError` hierarchy + one error-handling middleware that's the *only* place that builds an HTTP error body |

Every pattern below is there to solve one of these, not for its own sake. If a pattern doesn't map to a row in that table, it's not in this plan.

---

## 2. Target architecture

Four layers, dependencies point inward only (classic Clean/Onion Architecture):

```
┌─────────────────────────────────────────────────────────┐
│ presentation/   (Express: controllers, routes, DTOs)     │
│        depends on ↓                                       │
├─────────────────────────────────────────────────────────┤
│ application/    (services / use-cases, event subscribers) │
│        depends on ↓                                       │
├─────────────────────────────────────────────────────────┤
│ domain/         (entities, value objects, errors, events, │
│                   repository INTERFACES — zero imports    │
│                   from the other three layers)             │
└─────────────────────────────────────────────────────────┘
        ▲
        │ implements
┌─────────────────────────────────────────────────────────┐
│ infrastructure/ (Postgres repositories, bcrypt, jsonwebtoken,│
│                   Winston, prom-client — all behind interfaces)│
└─────────────────────────────────────────────────────────┘

composition/container.ts wires infrastructure → application → presentation
```

The rule that matters: **domain/ never imports from anywhere else.** It's plain TypeScript — no Express, no `pg`, no `jsonwebtoken`. That's what makes `AuthService` testable with an in-memory fake repository in milliseconds, no database required.

### 2.1 Proposed folder structure

```
app/backend/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── User.ts
│   │   │   └── Task.ts
│   │   ├── value-objects/
│   │   │   ├── Email.ts
│   │   │   ├── TaskStatus.ts
│   │   │   └── TaskPriority.ts
│   │   ├── errors/
│   │   │   ├── AppError.ts            # abstract base: statusCode, isOperational
│   │   │   ├── NotFoundError.ts
│   │   │   ├── ValidationError.ts
│   │   │   ├── ConflictError.ts
│   │   │   ├── UnauthorizedError.ts
│   │   │   └── RateLimitedError.ts
│   │   ├── events/
│   │   │   ├── DomainEvent.ts
│   │   │   ├── AuthEvents.ts          # UserRegistered, UserAuthenticated, UserLoggedOut
│   │   │   └── TaskEvents.ts          # TaskCreated, TaskUpdated, TaskDeleted
│   │   └── repositories/              # interfaces only
│   │       ├── IUserRepository.ts
│   │       ├── ITaskRepository.ts
│   │       └── ITokenBlacklistRepository.ts
│   │
│   ├── application/
│   │   ├── services/
│   │   │   ├── AuthService.ts         # register / login / logout / getCurrentUser
│   │   │   ├── TaskService.ts         # createTask / listTasks / updateTask / deleteTask / getStats
│   │   │   └── TokenService.ts        # issue / verify / revoke — Strategy-based signer
│   │   ├── ports/                     # interfaces the application layer needs from infra
│   │   │   ├── IPasswordHasher.ts
│   │   │   ├── ITokenProvider.ts
│   │   │   ├── IClock.ts              # inject "now" instead of `new Date()` scattered around
│   │   │   └── IEventBus.ts
│   │   └── subscribers/
│   │       ├── MetricsSubscriber.ts
│   │       └── AuditLogSubscriber.ts
│   │
│   ├── infrastructure/
│   │   ├── persistence/postgres/
│   │   │   ├── PostgresConnection.ts
│   │   │   ├── PostgresUserRepository.ts
│   │   │   ├── PostgresTaskRepository.ts
│   │   │   └── PostgresTokenBlacklistRepository.ts
│   │   ├── security/
│   │   │   ├── BcryptPasswordHasher.ts
│   │   │   └── JwtTokenProvider.ts
│   │   ├── events/InMemoryEventBus.ts
│   │   ├── logging/WinstonLogger.ts
│   │   ├── metrics/PrometheusMetricsRegistry.ts
│   │   └── config/Config.ts
│   │
│   ├── presentation/http/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── controllers/{Auth,Task,Health}Controller.ts
│   │   ├── routes/{auth,task,health}Routes.ts
│   │   ├── middleware/{auth,errorHandler,rateLimiters,requestLogger}.ts
│   │   ├── dto/{Register,Login,CreateTask,UpdateTask}RequestDto.ts
│   │   └── validators/{auth,task}Validators.ts
│   │
│   ├── composition/container.ts        # the one file that does `new`
│   └── main.ts                         # build container → build app → listen
│
├── tests/
│   ├── unit/                # domain + application, run against fakes, no DB
│   ├── integration/         # real Postgres + real Express (today's src/test/security/* moves here)
│   └── fakes/
│       ├── InMemoryUserRepository.ts
│       ├── InMemoryTaskRepository.ts
│       └── FixedClock.ts
│
├── tsconfig.json
└── Dockerfile
```

This is more ceremony than a 2-resource CRUD app strictly needs. That's fine here on purpose — the explicit goal is to *practice* the patterns, and small footprint is exactly what makes it safe to over-structure without getting lost. It would be a bad call on a bigger app you didn't already understand end-to-end; it's a reasonable call on this one.

---

## 3. Design pattern catalog (what, where, why)

- **Repository** — `IUserRepository`/`ITaskRepository`/`ITokenBlacklistRepository` in `domain/`, `Postgres*Repository` implementations in `infrastructure/`. Replaces `models/User.js` and `models/Task.js`. Services depend on the interface, never on `pg` directly.
- **Dependency Injection** — every service/controller takes its dependencies as constructor arguments. `composition/container.ts` is the single place anything gets `new`'d up with concrete implementations. No hidden module-level singletons imported by path (today's `import { query } from '../config/database.js'` pattern).
- **Service Layer / Use Cases** — `AuthService`, `TaskService`. Controllers become adapters: parse HTTP request → call one service method → map result/error to HTTP response. No business rules in controllers.
- **Strategy** — `ITokenProvider` (JWT today via `JwtTokenProvider`, swappable later), `IPasswordHasher` (bcrypt today). Also a natural fit for the two rate-limit policies (generic vs. auth-specific) as configured strategies rather than duplicated `express-rate-limit` blocks.
- **Observer** — `IEventBus` + domain events. `AuthService.register()` publishes `UserRegisteredEvent`; `MetricsSubscriber` and `AuditLogSubscriber` react independently. Adding a new side effect later (e.g. a welcome email) means adding a subscriber, not editing `AuthService`.
- **Factory** (light touch) — a small `RepositoryFactory`/the container itself selects Postgres implementations in production and in-memory fakes in unit tests, from one place.
- **Adapter** — `PostgresConnection` wraps `pg.Pool`; `WinstonLogger` implements a generic `ILogger` interface so the rest of the app doesn't import `winston` directly; `JwtTokenProvider` wraps `jsonwebtoken` the same way.
- **Singleton** — `Config` (validated once at boot, fail-fast — this already exists in spirit in `config/index.js`, just not as an explicit class), `PostgresConnection`'s pool.
- **Value Objects** — `Email` (validates + normalizes once, at the boundary), `TaskStatus`/`TaskPriority` (typed enums instead of raw strings threaded through every layer).
- **Exception hierarchy** (core OOP practice, not a GoF pattern) — `AppError` base class with subclasses carrying their own `statusCode`. The error-handling middleware becomes one `instanceof` check per case, not Postgres-error-code sniffing.

Patterns deliberately **not** used: no generic-purpose IoC/DI framework (a hand-rolled composition root is more transparent and easier to learn from at this size), no CQRS, no event sourcing, no microservices split — all overkill for this app.

---

## 4. TypeScript adoption specifics

- `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, keeping `"type": "module"` in `package.json` — stays consistent with the current ESM codebase and modern Node (22.x, already pinned in `render.yaml`).
  - **Known friction, flagged so it's not a surprise**: NodeNext ESM requires relative imports to include the `.js` extension even in `.ts` source files (`import { User } from '../domain/entities/User.js'`, referring to the future compiled output, not a real file on disk while editing). This is a real TypeScript+ESM quirk, not a mistake — every NodeNext TS project does this.
- `strict: true` (implies `noImplicitAny`, `strictNullChecks`, etc.) — the whole point of moving to TS is compile-time guarantees; a non-strict tsconfig would defeat that.
- Dev loop: `tsx watch src/main.ts` (fast, no separate compile step needed during development) instead of the current `nodemon src/server.js`.
- Build: `tsc -p tsconfig.build.json` → `dist/`. Production `start` script becomes `node dist/main.js`.
- Vitest already handles `.ts` test files natively (esbuild transform under the hood) — no config changes needed there beyond updating `include` globs to `tests/**/*.test.ts`.
- New/changed devDependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/cors`, `@types/compression`; `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` replacing the current plain `@eslint/js` config.

### Docker & Render impact

- **Dockerfile**: needs a new build stage (matches the existing multi-stage pattern, just one more stage). `deps` installs *all* dependencies (including `typescript`), a new `build` stage runs `npm run build`, and the final `runner` stage copies only `dist/` plus a fresh `npm ci --omit=dev` install — so the shipped image still has no TypeScript, no dev tooling, and (as today) no `npm`/`npx` binary at runtime. Image size/attack surface should be unaffected.
- **render.yaml**: `buildCommand: npm ci` becomes `buildCommand: npm ci && npm run build`. `startCommand` stays `npm run db:init && npm start`, where `db:init` and `start` both point at compiled files under `dist/`.
- **CI (`main.yml`, `pr-check.yml`)**: add a `tsc --noEmit` type-check step alongside the existing lint step — this is the main new safety net TypeScript buys you, so it should gate merges the same way lint does today.

---

## 5. Testing strategy in the new architecture

The 119 tests from this session don't get thrown away — they get **relocated and, in some cases, split**:

- Everything currently in `src/test/security/*.test.js` (auth, authorization/IDOR, injection, headers, rate limiting, metrics gating) is an **integration test** by nature — it exercises the real Express app end-to-end against a real Postgres instance. Those move to `tests/integration/`, updated only where import paths change (e.g. `app.js` → `presentation/http/app.ts`). Their assertions don't need to change — they test *behavior*, which this rewrite is explicitly not supposed to alter except where called out in §6.
- `models/User.test.js` and `models/Task.test.js` (today: real-DB tests of the model layer) become integration tests of `PostgresUserRepository`/`PostgresTaskRepository`.
- `middleware/auth.test.js`, `controllers/authController.test.js`, `controllers/taskController.test.js` (today: unit tests requiring `vi.mock()` on 4-5 modules each) get replaced by **much simpler** unit tests: `AuthService`/`TaskService` tested against `InMemoryUserRepository`/`InMemoryTaskRepository` fakes — real objects, not mocks, no `vi.mock()` needed at all. This is the most concrete before/after improvement this rewrite buys.
- `middleware/errorHandler.test.js` (added this session) becomes unit tests of the new `errorHandlerMiddleware`, now testing `instanceof AppError` branches instead of Postgres error codes.

Net effect: fewer mocks, more fakes, faster unit tests, and the integration suite keeps acting as the safety net proving the rewrite didn't change observable behavior.

---

## 6. Wire-format changes (what actually breaks)

Frontend is out of scope, so the default is: **keep every endpoint's request/response JSON shape identical.** That's free (costs nothing extra to preserve) and avoids forcing frontend changes that aren't part of this plan.

One deliberate exception, worth calling out explicitly: **error response envelopes are currently inconsistent** —

- `authController.js` sends bare `{ message: "..." }` on 401/409
- `validate.js` sends `{ status: 'error', message: '...', errors: [...] }`
- `errorHandler.js` sends `{ status: 'error', message: '...' }`

The new `AppError`-driven error middleware will standardize **every** error response to `{ status: 'error', message, errors?: [...] }`. This is a breaking change in the strict sense, but low-risk in practice: the frontend's error handling (`err.response?.data?.message`, per `AuthContext.jsx`/`Login.jsx`) only ever reads `.message`, which is present in both the old and new shape. Worth confirming against the actual frontend call sites before cutover, not assuming.

Any other wire-format change should be treated as out of scope unless it's specifically raised and agreed on first.

---

## 7. Phased migration plan

Recommended approach: **vertical slices, not a big-bang rewrite** — even though the app is small enough that a big-bang branch would fit in one PR, doing it slice-by-slice keeps the app deployable and the test suite green after every phase, which is worth more here than the time saved by batching it. Each phase ends with lint clean, `tsc --noEmit` clean, full test suite green, and a git handoff — same rhythm as the rest of this session.

1. **Toolchain & skeleton** — tsconfig, npm scripts, empty layer folders, CI gets a type-check step, Dockerfile gets a build stage. Nothing behavioral changes; this phase is "does it still boot and pass," full stop.
2. **Domain foundations** (shared by both resources) — `AppError` hierarchy, `Email` value object, `IClock`, `IEventBus` + `InMemoryEventBus`, `Config` class, `WinstonLogger` behind `ILogger`, `PostgresConnection` adapter.
3. **Auth vertical slice** — `IUserRepository`/`PostgresUserRepository`, `ITokenBlacklistRepository`/Postgres impl, `BcryptPasswordHasher`, `JwtTokenProvider`, `AuthService`, `TokenService`, `AuthController`, auth routes/middleware/DTOs, `MetricsSubscriber`/`AuditLogSubscriber` wired to auth events. Old `authController.js`/`authRoutes.js`/`models/User.js` retired once integration tests are green against the new slice.
4. **Task vertical slice** — same pattern, second time is faster. `ITaskRepository`, `TaskService`, `TaskController`, task events. Old `taskController.js`/`taskRoutes.js`/`models/Task.js` retired. *(Done — it was indeed faster, and it also took `middleware/auth.js`, `middleware/validate.js`, and `models/TokenBlacklist.js` with it, since the task routes were their last remaining importer.)*
5. **Cross-cutting cleanup** — health/metrics endpoints rebuilt as thin controllers on the new `Config`/`ILogger`; delete every old file the new layers replaced; confirm nothing in `src/` still references the pre-rewrite layout. *(Done. It also absorbed the two database scripts and the last JavaScript test files, since deleting `config/database.js` left them with nothing to import — and, having reached zero `.js` under `src/`, the `allowJs` removal that §7 had parked in Phase 6.)*
6. **Docs & infra catch-up** — update `docs/ARCHITECTURE.md` (currently describes the old Controllers→Models→Database layering) to reflect the new layered design, sanity-check the DevOps Tour content in the frontend for any command examples that assumed old file paths, sweep the source comments that still say "today's `taskController.js`" and the like now that there is no such file (the comparisons are worth keeping — the tense is not; Phase 5 fixed only the files it otherwise touched, to keep its own diff reviewable), and clear the remaining tooling cruft: the unused `jest` devDependency (and the `overrides` entries that exist only for its transitive dependencies) and the legacy `.eslintrc.cjs`, which ESLint 10 ignores entirely in favor of the flat config. The Dockerfile/render.yaml/CI work from §4 is already done — see the ordering note above.
7. **Optional stretch, not required for "done"** — pluggable password-policy strategies, refresh-token rotation as its own service, request-scoped correlation IDs in logs, OpenAPI generation from the DTOs.

---

## 8. Explicitly out of scope

- The React frontend — no component, hook, or API-client changes.
- Swapping Express for another framework.
- Swapping `pg` for an ORM (decided above).
- Changing the Postgres schema's actual shape (tables/columns stay as-is; only *how* migrations are tracked changes, per the `token_blacklist` gap noted in §1).
- Docker Compose local dev topology, Prometheus/Grafana, the DevOps Tour pages, CI provider — all unchanged.
- Microservices, message queues, GraphQL, multi-tenancy — not this project's problem right now.

---

## 9. Open questions worth deciding before Phase 1 starts

- Should `docs/ARCHITECTURE.md` be updated incrementally per phase, or once at the end (Phase 6)? Leaning incremental so it never goes stale mid-rewrite.
- `node-pg-migrate` is already a devDependency but unused for what's actually shipped (schema.sql + the guarded `initSchema.ts` blocks are the real source of truth today). Formalizing on it is implied by §1's `token_blacklist` example — worth confirming that's wanted, since it also touches `scripts/setup.sh`, the Docker Compose Postgres init, and CI's migration step.
- Branch strategy: one long-lived `backend-rewrite` branch merged phase-by-phase, or a PR per phase against `main`? Given `main.yml`'s CI already runs on every push to `main`, a PR per phase keeps `main` always deployable, which fits how Render's `autoDeployTrigger: commit` is configured.
