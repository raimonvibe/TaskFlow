-- TaskFlow Database Schema
-- PostgreSQL 13+
--
-- THE single source of truth for the schema. Everything that creates a
-- database applies this file and only this file: src/database/initSchema.ts
-- (Render's startCommand, via `npm run db:init`), src/test/globalSetup.ts,
-- both Compose files' docker-entrypoint-initdb.d mounts, CI's test job, and
-- the Supabase migration in infrastructure/hybrid. There is no migration
-- tool and no second copy of any table's DDL - see the note below before
-- adding one.
--
-- EVERY statement here must be idempotent, because this file is applied on
-- every boot rather than once. That is what lets an existing database pick
-- up a newly added table without a migration step: CREATE TABLE IF NOT
-- EXISTS adds what is missing and leaves what is already there alone. The
-- whole file runs as one implicit transaction, so a failure part-way rolls
-- back rather than leaving a half-applied schema.
--
-- What this arrangement can and cannot do: it converges for *additive*
-- changes - a new table, a new index, a new nullable column added with
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS. It cannot express a destructive
-- or transforming one, because there is no record of which databases have
-- already been changed. Dropping a column, renaming one, narrowing a type,
-- or backfilling data needs a real migration tool. Reaching that point is
-- the signal to adopt one - deliberately, replacing this file rather than
-- sitting alongside it.

-- Enable UUID extension (optional, for future use)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task status and priority enums.
-- CREATE TYPE has no IF NOT EXISTS, so each one is wrapped in a DO block
-- that swallows duplicate_object. Without this the second application of
-- this file would abort here and roll back the whole transaction.
DO $$
BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revoked JWTs (logout). Persisted here rather than kept in memory so a
-- revoked token stays revoked across restarts (Render's free tier restarts
-- often). Keyed by the token's own sha256 hash, not the raw token, so a
-- database leak doesn't itself hand out valid bearer tokens. See
-- src/infrastructure/persistence/postgres/PostgresTokenBlacklistRepository.ts.
CREATE TABLE IF NOT EXISTS token_blacklist (
    token_hash VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Token blacklist indexes
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tasks table
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE users IS 'User accounts for the TaskFlow application';
COMMENT ON COLUMN users.id IS 'Primary key';
COMMENT ON COLUMN users.name IS 'Full name of the user';
COMMENT ON COLUMN users.email IS 'Unique email address for login';
COMMENT ON COLUMN users.password IS 'Bcrypt hashed password';

COMMENT ON TABLE tasks IS 'User tasks and to-dos';
COMMENT ON COLUMN tasks.id IS 'Primary key';
COMMENT ON COLUMN tasks.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN tasks.title IS 'Task title/summary';
COMMENT ON COLUMN tasks.description IS 'Detailed task description (optional)';
COMMENT ON COLUMN tasks.status IS 'Current status of the task';
COMMENT ON COLUMN tasks.priority IS 'Priority level of the task';
COMMENT ON COLUMN tasks.due_date IS 'When the task is due (optional)';

COMMENT ON TABLE token_blacklist IS 'Revoked JWTs (logout), keyed by token hash, until their own expiry';

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column on row update';
