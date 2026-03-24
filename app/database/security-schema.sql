-- Database Security Enhancements for TaskFlow
-- Apply these after initial schema setup for production

-- ==========================================
-- 1. CREATE DEDICATED ROLES WITH LEAST PRIVILEGE
-- ==========================================

-- Read-only role for reporting/analytics
CREATE ROLE taskflow_readonly;
GRANT CONNECT ON DATABASE taskflow TO taskflow_readonly;
GRANT USAGE ON SCHEMA public TO taskflow_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO taskflow_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO taskflow_readonly;

-- Application role with limited permissions
CREATE ROLE taskflow_app;
GRANT CONNECT ON DATABASE taskflow TO taskflow_app;
GRANT USAGE, CREATE ON SCHEMA public TO taskflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, tasks TO taskflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO taskflow_app;

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on tasks table (users can only see their own tasks)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own tasks
CREATE POLICY tasks_select_policy ON tasks
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- Policy: Users can only insert tasks for themselves
CREATE POLICY tasks_insert_policy ON tasks
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id')::INTEGER);

-- Policy: Users can only update their own tasks
CREATE POLICY tasks_update_policy ON tasks
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- Policy: Users can only delete their own tasks
CREATE POLICY tasks_delete_policy ON tasks
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- Enable RLS on users table (users can only see their own data)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own user record
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (id = current_setting('app.current_user_id')::INTEGER);

-- Policy: Users can update only their own record
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = current_setting('app.current_user_id')::INTEGER);

-- ==========================================
-- 3. AUDIT LOGGING
-- ==========================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255)
);

-- Create index for faster queries
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);

-- Function to log changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, user_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.user_id, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.user_id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.user_id, row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER tasks_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==========================================
-- 4. DATA ENCRYPTION AT REST (pgcrypto)
-- ==========================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt sensitive user data (optional)
-- Add encrypted fields if needed
-- ALTER TABLE users ADD COLUMN phone_encrypted BYTEA;

-- Function to encrypt data
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt data
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. PREVENT SQL INJECTION
-- ==========================================

-- Function to sanitize input (basic example)
CREATE OR REPLACE FUNCTION sanitize_input(input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove potentially dangerous characters
    RETURN regexp_replace(input, '[;''"\-\-]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 6. SECURE PASSWORD STORAGE VERIFICATION
-- ==========================================

-- Ensure passwords are hashed (add constraint)
ALTER TABLE users
    ADD CONSTRAINT password_format_check
    CHECK (password ~ '^\$2[aby]\$[0-9]{2}\$.{53}$'); -- bcrypt format

-- ==========================================
-- 7. FAILED LOGIN TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT
);

CREATE INDEX idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_time ON failed_login_attempts(attempt_time DESC);

-- Function to clean old failed attempts (auto cleanup after 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_failed_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM failed_login_attempts
    WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. SESSION MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < NOW() OR is_active = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. RATE LIMITING AT DATABASE LEVEL
-- ==========================================

CREATE TABLE IF NOT EXISTS rate_limit_log (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP or user ID
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '15 minutes'
);

CREATE INDEX idx_rate_limit_identifier ON rate_limit_log(identifier, endpoint, window_end);

-- ==========================================
-- 10. SCHEDULED MAINTENANCE TASKS
-- ==========================================

-- Note: Use pg_cron extension or external cron for these

-- Clean old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_log
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 11. BACKUP VERIFICATION
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_log (
    id SERIAL PRIMARY KEY,
    backup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    backup_type VARCHAR(50), -- full, incremental
    backup_size BIGINT,
    backup_location TEXT,
    verification_status VARCHAR(50),
    checksum VARCHAR(255)
);

-- ==========================================
-- 12. GRANT MINIMUM PRIVILEGES
-- ==========================================

-- Revoke all privileges first
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Grant only necessary privileges to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON users, tasks TO taskflow_user;
GRANT SELECT, INSERT ON audit_log TO taskflow_user;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO taskflow_user;
GRANT SELECT, INSERT ON failed_login_attempts TO taskflow_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO taskflow_user;

-- ==========================================
-- 13. ENABLE SSL/TLS ONLY
-- ==========================================

-- In postgresql.conf:
-- ssl = on
-- ssl_cert_file = '/path/to/server.crt'
-- ssl_key_file = '/path/to/server.key'

-- In pg_hba.conf, enforce SSL:
-- hostssl all all 0.0.0.0/0 scram-sha-256

-- ==========================================
-- 14. SECURITY VIEWS
-- ==========================================

-- View for monitoring suspicious activity
CREATE OR REPLACE VIEW suspicious_activity AS
SELECT
    email,
    ip_address,
    COUNT(*) as failed_attempts,
    MAX(attempt_time) as last_attempt
FROM failed_login_attempts
WHERE attempt_time > NOW() - INTERVAL '1 hour'
GROUP BY email, ip_address
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;

-- View for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    u.email,
    s.ip_address,
    s.last_activity,
    s.created_at,
    s.expires_at
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = TRUE
AND s.expires_at > NOW()
ORDER BY s.last_activity DESC;

-- ==========================================
-- SECURITY CHECKLIST
-- ==========================================

-- [ ] Row Level Security enabled on all user data tables
-- [ ] Audit logging configured for sensitive operations
-- [ ] Password format constraints enforced
-- [ ] Failed login tracking enabled
-- [ ] Session management implemented
-- [ ] SSL/TLS enforced for all connections
-- [ ] Minimum privilege grants applied
-- [ ] Regular backup verification scheduled
-- [ ] Old data cleanup jobs scheduled
-- [ ] pgcrypto extension enabled for encryption
-- [ ] Database user has strong password
-- [ ] Connection pooling configured
-- [ ] Query timeouts set
-- [ ] Regular security audits scheduled
-- ==========================================
