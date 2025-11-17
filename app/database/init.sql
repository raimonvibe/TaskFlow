-- Initial database setup script
-- This script is used by Docker to initialize the database
-- It creates the database and user if they don't exist

-- Create user if not exists (for Docker initialization)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'taskflow_user') THEN
    CREATE USER taskflow_user WITH PASSWORD 'taskflow_password';
  END IF;
END
$$;

-- Create database if not exists
SELECT 'CREATE DATABASE taskflow OWNER taskflow_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'taskflow')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE taskflow TO taskflow_user;

-- Connect to the taskflow database
\c taskflow

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO taskflow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO taskflow_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO taskflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO taskflow_user;
