# Backend Rewrite Plan: TypeScript, Clean Architecture, Design Patterns

Status: **Phase 2 (domain foundations) done.**

- *Phase 1 (toolchain & skeleton)*: TypeScript, tsx, and the `@types/*` packages are installed; `tsconfig.json`/`tsconfig.build.json` are in place (strict, NodeNext); ESLint understands `.ts` files; the five layer folders (`domain/`, `application/`, `infrastructure/`, `presentation/`, `composition/`) exist with marker files explaining what belongs in each; CI (`main.yml`, `pr-check.yml`) runs `npm run typecheck` for the backend.
- *Phase 2 (domain foundations)*: the `AppError` hierarchy (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `RateLimitedError`), the `Email` value object, `DomainEvent`, the `IClock`/`IEventBus`/`ILogger` ports with their `SystemClock`/`InMemoryEventBus`/`WinstonLogger` implementations, the validated `Config` class, and the `PostgresConnection` adapter — each with unit tests, and a `FixedClock` fake under `src/test/fakes/`.

Nothing in `src/*.js` changed in either phase — **none of the new code is wired into the running app yet.** `src/server.js` still uses the pre-rewrite modules (`config/index.js`, `config/database.js`, `utils/logger.js`), and the new classes sit alongside them unused until Phase 3 cuts the auth slice over. The app boots and behaves exactly as before; `npm run typecheck`, `npm run lint`, `npm run build`, and the test suite are all green.

**Phase 3 (auth vertical slice) is code-complete but not yet serving traffic** — the full slice exists and is unit-tested (`IUserRepository`/`PostgresUserRepository`, `ITokenBlacklistRepository`/Postgres impl, `BcryptPasswordHasher`, `JwtTokenProvider`, `TokenService`, `AuthService`, `AuthController`, auth routes/validators/DTOs, `authenticate` + `errorHandler` middleware, `MetricsSubscriber`/`AuditLogSubscriber`, and a working composition root), but nothing routes to it yet.

### The ordering problem this phase surfaced

§7 sequences the entrypoint and deployment work into Phase 6, and phases 3–5 into "vertical slices [that keep] the app deployable." Those two can't both hold. `src/app.js` and `src/server.js` are JavaScript, `npm start` is plain `node src/server.js`, and **Node cannot import a `.ts` file at runtime**. So no amount of new TypeScript can serve a request until the entrypoint itself becomes TypeScript — which means `app.ts`, `main.ts`, the `dev`/`start`/`db:init` scripts, the Dockerfile build stage, and `render.yaml`'s `buildCommand` all have to move *together*, as one cutover, before any slice goes live.

That work is listed under Phase 6 but is a prerequisite for Phase 3, not a follow-up to it. The plan was written assuming slices could go live incrementally; they can't. Two ways forward:

1. **Cut over now** — do Phase 6's entrypoint/infra work as part of Phase 3, so the auth slice actually serves traffic and the integration suite proves it. Requires `allowJs` so `app.ts` can keep importing the not-yet-migrated task/health routes, and it touches the deploy path (Dockerfile, render.yaml), so a bad cutover breaks production rather than just CI.
2. **Build phases 3–5 in full first, cut over once at the end** — the new code sits complete and unit-tested but dormant until a single cutover switches every route at once. Lower deploy risk (one cutover instead of one per slice, with nothing half-migrated in production), at the cost of the new code being unexercised end-to-end until then.

Either way, §7's phase list needs correcting: the entrypoint/infra move is a phase boundary of its own, not a documentation catch-up task.

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
4. **Task vertical slice** — same pattern, second time is faster. `ITaskRepository`, `TaskService`, `TaskController`, task events. Old `taskController.js`/`taskRoutes.js`/`models/Task.js` retired.
5. **Cross-cutting cleanup** — health/metrics endpoints rebuilt as thin controllers on the new `Config`/`ILogger`; delete every old file the new layers replaced; confirm nothing in `src/` still references the pre-rewrite layout.
6. **Docs & infra catch-up** — update `docs/ARCHITECTURE.md` (currently describes the old Controllers→Models→Database layering) to reflect the new layered design, update Dockerfile/render.yaml/CI as in §4, sanity-check the DevOps Tour content in the frontend for any command examples that assumed old file paths.
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
- `node-pg-migrate` is already a devDependency but unused for what's actually shipped (schema.sql + the guarded `init-schema.js` blocks are the real source of truth today). Formalizing on it is implied by §1's `token_blacklist` example — worth confirming that's wanted, since it also touches `scripts/setup.sh`, the Docker Compose Postgres init, and CI's migration step.
- Branch strategy: one long-lived `backend-rewrite` branch merged phase-by-phase, or a PR per phase against `main`? Given `main.yml`'s CI already runs on every push to `main`, a PR per phase keeps `main` always deployable, which fits how Render's `autoDeployTrigger: commit` is configured.
