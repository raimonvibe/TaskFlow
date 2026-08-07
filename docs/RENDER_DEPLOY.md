# Deploying to Render (Free Tier)

This repo includes a [Render Blueprint](https://render.com/docs/blueprint-spec) (`render.yaml` at the repo root) that provisions everything TaskFlow needs on Render's free tier:

| Resource | Type | Plan | Notes |
|---|---|---|---|
| `taskflow-db` | Render Postgres | Free | **Deleted automatically 30 days after creation** — see [Free Postgres expiry](#free-postgres-expires-after-30-days) below |
| `taskflow-backend` | Web service (Node) | Free | Sleeps after ~15 min idle; cold start ~30-60s |
| `taskflow-frontend` | Static site (Vite build) | Free (default) | Never sleeps, served from Render's CDN; static sites do not use a `plan` field in `render.yaml` |

A GitHub Actions workflow (`.github/workflows/keepalive.yml`) pings the backend's `/health` endpoint every 10 minutes to keep it from sleeping. Render's own Cron Jobs were **not** used for this because they aren't free (minimum $1/month) — see [Why GitHub Actions instead of a Render Cron Job](#why-github-actions-instead-of-a-render-cron-job).

## Prerequisites

- This repo pushed to GitHub (Render deploys from a Git repo)
- A free [Render account](https://dashboard.render.com/register), connected to your GitHub account

## 1. Deploy the Blueprint

1. In the Render Dashboard, go to **Blueprints → New Blueprint Instance**.
2. Select this GitHub repo. Render detects `render.yaml` automatically.
3. Review the three resources it lists (`taskflow-db`, `taskflow-backend`, `taskflow-frontend`) and click **Apply**.
4. Render provisions the database first, then builds and deploys both services. First deploy takes a few minutes (the backend's `startCommand` also applies the database schema automatically on first boot — see [Database schema](#database-schema-init) below).

Everything else — the database connection string, JWT secret, and CORS origin — is wired up automatically inside `render.yaml` via `fromDatabase` and `fromService` references, so there's nothing to fill in manually during setup.

## 2. Set up the keep-alive ping

Once the first deploy finishes, copy the backend's URL from its page in the Render Dashboard (e.g. `https://taskflow-backend.onrender.com`), then:

1. In GitHub: repo **Settings → Secrets and variables → Actions → Variables tab → New repository variable**.
2. Name: `RENDER_BACKEND_URL`, Value: the URL you copied (no trailing slash).
3. The `keepalive.yml` workflow starts running automatically every 10 minutes. You can also trigger it manually from the **Actions** tab (`workflow_dispatch`) to confirm it works.

## Database schema init

`app/backend/src/database/init-schema.js` runs in the backend's `startCommand` (`npm run db:init && npm start`) on every deploy. Render's free tier does not support `preDeployCommand`, so schema init runs at service start instead (when `DATABASE_URL` is available). It checks whether the `users` table already exists; if not, it applies `app/database/schema.sql` once. This makes first-deploy setup automatic without risking errors from re-running non-idempotent `CREATE TYPE`/`CREATE TRIGGER` statements on later deploys.

If you need to change the schema later, either add a new guarded step to that script or switch to `node-pg-migrate` (already a dependency) for real migrations.

## Free Postgres expires after 30 days

Render's free Postgres plan is deleted **30 days after creation** — this is a hard platform limit, not something `render.yaml` can work around. For anything beyond a demo/learning deployment:

- Upgrade `taskflow-db`'s plan in `render.yaml` (e.g. `plan: basic-256mb`, ~$6/month) before the 30 days are up, or
- Export/back up the database and re-provision before expiry if you want to stay fully free.

Render emails you a warning before the database is deleted.

## Why GitHub Actions instead of a Render Cron Job

Render's Cron Jobs service type has no free instance — pricing starts at $1/month minimum. Since the goal was a fully free production setup, the keep-alive ping runs as a scheduled GitHub Actions workflow instead, which costs nothing on a standard GitHub plan. If you'd rather keep everything inside Render (and don't mind the small monthly cost), you can add a `type: cron` service to `render.yaml` that curls `$RENDER_BACKEND_URL/health` on the same schedule, and delete `.github/workflows/keepalive.yml`.

## Local vs. Render environment variables

The backend now supports two ways of configuring its database connection:

- **`DATABASE_URL`** (used automatically on Render via `fromDatabase: connectionString`) — takes priority when set.
- **Discrete `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`** — still used for local development and `docker-compose` (see `.env.example`), unchanged.

`CORS_ORIGIN` and `VITE_API_URL` are also wired automatically between the two Render services via `fromService`, so the frontend and backend always point at each other's current URLs without manual updates after redeploys.
