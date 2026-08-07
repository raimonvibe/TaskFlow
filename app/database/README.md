# TaskFlow Database

PostgreSQL database schema for TaskFlow.

## Overview

This directory contains:
- **schema.sql**: the complete schema, and the only source of truth for it
- **init.sql**: Docker initialization script (creates the role and database)
- **security-schema.sql**: optional production hardening — roles, RLS, audit
  logging. Applied on top of `schema.sql`, and only by
  `docker-compose.secure.yml`.

Seed data lives in the backend (`app/backend/src/database/seed.ts`).

## How the schema gets applied

There is no migration tool. `schema.sql` is written to be idempotent — every
statement is `IF NOT EXISTS`, `OR REPLACE`, or guarded — so everything that
needs a schema just applies the whole file, and re-applying it is a no-op:

| Where | How |
|---|---|
| Render (production) | `npm run db:init` in the `startCommand`, on every deploy |
| Docker Compose | mounted into `docker-entrypoint-initdb.d`, on first init |
| CI | `psql -f schema.sql` before the test job |
| Tests | `src/test/globalSetup.ts`, once per run |
| Terraform (hybrid) | `supabase_migration.taskflow_schema` |

**Changing the schema** means editing `schema.sql`, and keeping it
idempotent. Adding a table or an index converges on its own — existing
databases pick it up the next time the file is applied.

What this cannot do is change something that already exists: dropping or
renaming a column, narrowing a type, or backfilling data, because nothing
records which databases have already been changed. That is the point at
which to adopt a real migration tool — deliberately, replacing this file
rather than running alongside it. Three sources of truth is how the
`token_blacklist` table came to be missing from a directory that looked
authoritative.

## Database Schema

### Users Table
Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique user ID |
| name | VARCHAR(255) | NOT NULL | User's full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

### Tasks Table
Stores user tasks and to-dos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique task ID |
| user_id | INTEGER | FK users(id), NOT NULL | Task owner |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | TEXT | NULLABLE | Task details |
| status | task_status | DEFAULT 'todo' | todo, in_progress, completed |
| priority | task_priority | DEFAULT 'medium' | low, medium, high |
| due_date | TIMESTAMP | NULLABLE | When task is due |
| created_at | TIMESTAMP | DEFAULT NOW() | Task creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

### Token Blacklist Table
Revoked JWTs, so a logout survives a restart.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| token_hash | VARCHAR(64) | PRIMARY KEY | SHA-256 of the token, not the token itself |
| expires_at | TIMESTAMP | NOT NULL | The token's own expiry; rows are swept after it |

Storing the hash rather than the raw token means a database leak does not
hand out usable bearer tokens.

### Indexes

Performance-optimized indexes:
- `idx_users_email` - Fast email lookups for authentication
- `idx_tasks_user_id` - Fast task queries by user
- `idx_tasks_status` - Filter tasks by status
- `idx_tasks_priority` - Filter tasks by priority
- `idx_tasks_due_date` - Sort/filter by due date
- `idx_tasks_created_at` - Sort by creation date
- `idx_token_blacklist_expires_at` - Sweep expired revocations

## Setup Instructions

### Option 1: Using psql directly

For local development:

```bash
# Create database
createdb taskflow

# Run schema
psql -d taskflow -f schema.sql

# Run seed data (optional)
cd ../backend
npm run seed:dev
```

### Option 2: Using the backend's own initializer

Same file, applied by the same code path production uses — so if it works
here it works on deploy:

```bash
cd ../backend
npm run build && npm run db:init
```

### Option 3: Using Docker (Easiest)

The `init.sql` script runs automatically when using Docker Compose:

```bash
# From project root
docker-compose up -d postgres

# Database is automatically initialized
```

## Seeding Data

To populate the database with sample data:

```bash
cd ../backend
npm run seed:dev     # straight from the TypeScript source
# or: npm run build && npm run seed
```

This creates:
- Demo user account
  - Email: `demo@taskflow.com`
  - Password: `demo123`
- 10 sample tasks with various statuses and priorities

## Maintenance

### Backup

```bash
# Backup entire database
pg_dump taskflow > backup.sql

# Backup only schema
pg_dump -s taskflow > schema_backup.sql

# Backup only data
pg_dump -a taskflow > data_backup.sql
```

### Restore

```bash
psql taskflow < backup.sql
```

### Reset Database

```bash
# Drop and recreate
dropdb taskflow
createdb taskflow
psql -d taskflow -f schema.sql
```

## Connection Strings

### Local Development
```
postgresql://postgres:postgres@localhost:5432/taskflow
```

### Docker Compose
```
postgresql://taskflow_user:taskflow_password@postgres:5432/taskflow
```

### Production
Set these environment variables in your backend `.env`:
```
DB_HOST=your-host
DB_PORT=5432
DB_NAME=taskflow
DB_USER=your-user
DB_PASSWORD=your-secure-password
```

## Performance Tuning

For production, consider:

1. **Connection Pooling**: Configured in backend (`max: 20`)
2. **Index Optimization**: All critical queries are indexed
3. **Query Analysis**: Use `EXPLAIN ANALYZE` for slow queries
4. **Regular VACUUM**: PostgreSQL auto-vacuum is enabled
5. **Monitoring**: Track connection count and slow queries

## Security

- Passwords are hashed with bcrypt (cost factor: 10)
- User emails are unique (prevents duplicates)
- Foreign key constraints ensure data integrity
- ON DELETE CASCADE removes tasks when user is deleted
- Connection pooling prevents connection exhaustion
- Prepared statements prevent SQL injection

## Troubleshooting

### Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -d taskflow -c "SELECT 1;"
```

### Permission Issues

```bash
# Grant all privileges
psql -d taskflow -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskflow_user;"
```

### Schema Errors

`schema.sql` must stay re-appliable — `npm run db:init` runs it on every
deploy. If a change to it fails on the second run but not the first, the new
statement is not idempotent. `CREATE TYPE` is the usual culprit, since it has
no `IF NOT EXISTS`; the two enums in the file show the `DO`-block form that
works around it.

```bash
# Prove a change is idempotent before shipping it
psql -d taskflow -f schema.sql && psql -d taskflow -f schema.sql
```

## Future Enhancements

Potential schema additions:
- Tags/labels for tasks
- Task comments/activity log
- File attachments
- User roles and permissions
- Task sharing between users
- Recurring tasks
- Task dependencies

## License

MIT
