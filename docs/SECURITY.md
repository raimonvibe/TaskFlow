# TaskFlow Security Documentation

Comprehensive security guide for the TaskFlow application.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Database Security](#database-security)
5. [Network Security](#network-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Secrets Management](#secrets-management)
8. [Monitoring & Auditing](#monitoring--auditing)
9. [Security Best Practices](#security-best-practices)
10. [Incident Response](#incident-response)

---

## Security Overview

TaskFlow implements defense-in-depth security with multiple layers:

### Security Layers

```
┌─────────────────────────────────────────┐
│   Network Layer (Firewall, SSL/TLS)    │
├─────────────────────────────────────────┤
│   Application Layer (Auth, Validation) │
├─────────────────────────────────────────┤
│   Database Layer (RLS, Encryption)     │
├─────────────────────────────────────────┤
│   Infrastructure (Containers, Secrets) │
└─────────────────────────────────────────┘
```

### Security Features Implemented

✅ JWT-based authentication with secure token handling
✅ bcrypt password hashing (cost factor 10)
✅ Input validation and sanitization (XSS, SQL injection prevention)
✅ Rate limiting and request throttling
✅ HTTPS enforcement in production
✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
✅ CORS protection
✅ Row-level security in database
✅ Audit logging
✅ Session management
✅ CSRF protection
✅ Docker security hardening
✅ Secrets encryption
✅ Regular security updates

---

## Authentication & Authorization

### JWT Implementation

**Token Structure:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "iss": "taskflow-api",
  "aud": "taskflow-client",
  "jti": "unique-token-id",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Security Features:**
- Algorithm explicitly set to HS256 (prevents "none" attack)
- Issuer and audience validation
- Unique token ID (JTI) for tracking
- Token blacklisting on logout
- Maximum token age enforcement
- Refresh token rotation

**Backend Implementation:**
```javascript
// Enhanced token verification
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'],
  issuer: 'taskflow-api',
  audience: 'taskflow-client'
})
```

### Password Security

**Requirements:**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Hashed using bcrypt with cost factor 10
- Password strength indicator in UI
- Rate limiting on login attempts (5 attempts per 15 minutes)

**Best Practices:**
```javascript
// Password hashing
const hashedPassword = await bcrypt.hash(password, 10)

// Password comparison (timing-safe)
const isValid = await bcrypt.compare(password, hashedPassword)
```

### Session Management

- Session tokens stored securely (sessionStorage, not localStorage)
- Automatic token expiration (7 days default)
- Session timeout on inactivity
- Logout invalidates tokens (blacklist)
- Failed login tracking

---

## Input Validation & Sanitization

### Backend Validation

**express-validator** implementation:

```javascript
// Registration validation
[
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .escape()
]
```

**SQL Injection Prevention:**
- Parameterized queries only
- Input sanitization middleware
- Pattern detection for SQL keywords
- PostgreSQL prepared statements

**Example:**
```javascript
// ✅ SAFE - Parameterized query
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
)

// ❌ UNSAFE - String concatenation
const result = await query(
  `SELECT * FROM users WHERE email = '${email}'`
)
```

### Frontend Validation

**XSS Prevention:**
```javascript
// Sanitize user input
const sanitizeInput = input => {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

// HTML escaping
const escapeHTML = str => {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}
```

**CSRF Protection:**
- CSRF tokens in forms
- SameSite cookie attribute
- Origin verification
- Custom request headers

---

## Database Security

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY tasks_select_policy ON tasks
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::INTEGER);
```

### Encryption

**At Rest:**
- Database volume encryption (LUKS, dm-crypt)
- Sensitive fields encrypted with pgcrypto
- Backup encryption

**In Transit:**
- SSL/TLS for all database connections
- Certificate validation
- Minimum TLS 1.2

**Configuration:**
```javascript
const pool = new Pool({
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.crt'),
    key: fs.readFileSync('/path/to/client.key'),
    cert: fs.readFileSync('/path/to/client.crt')
  }
})
```

### Access Control

**Principle of Least Privilege:**
```sql
-- Application user has limited permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users, tasks TO taskflow_user;
GRANT SELECT, INSERT ON audit_log TO taskflow_user;
GRANT USAGE, SELECT ON ALL SEQUENCES TO taskflow_user;

-- Read-only user for reporting
GRANT SELECT ON ALL TABLES TO taskflow_readonly;
```

### Audit Logging

All sensitive operations are logged:
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255),
  operation VARCHAR(10),
  user_id INTEGER,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## Network Security

### HTTPS/TLS

**Configuration:**
- TLS 1.2 minimum
- Strong cipher suites only
- HSTS enabled (max-age 31536000)
- Certificate pinning (optional)

**Nginx Configuration:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
```

### Firewall Rules

**UFW Configuration:**
```bash
# Default deny
ufw default deny incoming
ufw default allow outgoing

# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 6443/tcp  # Kubernetes API (if applicable)

# Enable
ufw enable
```

### Rate Limiting

**Multiple Layers:**
```javascript
// Authentication endpoints (strict)
authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
})

// General API (moderate)
apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

// Progressive delay
speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500
})
```

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
  maxAge: 600,
  optionsSuccessStatus: 204
}))
```

---

## Infrastructure Security

### Docker Security

**Hardening Measures:**

1. **Run as Non-Root:**
```dockerfile
# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

USER appuser
```

2. **Read-Only Filesystem:**
```yaml
read_only: true
tmpfs:
  - /tmp
  - /app/logs
```

3. **Drop Capabilities:**
```yaml
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE  # Only if needed
```

4. **Resource Limits:**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

5. **Security Options:**
```yaml
security_opt:
  - no-new-privileges:true
  - apparmor=docker-default
```

### Kubernetes Security

**Pod Security:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

**Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
```

---

## Secrets Management

### Environment Variables

**Never commit secrets to Git!**

```bash
# Generate strong secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use OpenSSL
openssl rand -base64 32
```

### Production Secrets Management

**Options:**

1. **Kubernetes Secrets:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: taskflow-secrets
type: Opaque
stringData:
  jwt-secret: ${JWT_SECRET}
  db-password: ${DB_PASSWORD}
```

2. **HashiCorp Vault:**
```bash
# Store secret
vault kv put secret/taskflow jwt_secret="..."

# Read secret
vault kv get -field=jwt_secret secret/taskflow
```

3. **AWS Secrets Manager:**
```javascript
const secretValue = await secretsManager
  .getSecretValue({ SecretId: 'taskflow/jwt-secret' })
  .promise()
```

### Encryption at Rest

```javascript
// Encrypt sensitive data
const encrypt = (text, key) => {
  const cipher = crypto.createCipher('aes-256-gcm', key)
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

// Decrypt
const decrypt = (encrypted, key) => {
  const decipher = crypto.createDecipher('aes-256-gcm', key)
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
}
```

---

## Monitoring & Auditing

### Security Monitoring

**Prometheus Alerts:**
```yaml
groups:
- name: security
  rules:
  - alert: HighFailedLoginRate
    expr: rate(auth_attempts_total{status="failure"}[5m]) > 5
    for: 5m
    annotations:
      summary: "High failed login rate detected"

  - alert: UnauthorizedAccess
    expr: rate(http_requests_total{status="403"}[5m]) > 10
    annotations:
      summary: "Multiple unauthorized access attempts"
```

### Audit Logging

**What to Log:**
- Authentication events (login, logout, failed attempts)
- Authorization failures
- Data access (sensitive resources)
- Configuration changes
- Security events

**Example:**
```javascript
logger.info('User login', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString()
})
```

### Log Analysis

**Detect suspicious patterns:**
- Multiple failed logins from same IP
- Unusual access patterns
- SQL injection attempts
- XSS attempts
- Rate limit violations

---

## Security Best Practices

### Development

- [ ] Never commit secrets to version control
- [ ] Use `.env.example` for documentation
- [ ] Run security linters (npm audit, Snyk)
- [ ] Keep dependencies updated
- [ ] Code reviews for security issues
- [ ] Use pre-commit hooks

### Deployment

- [ ] Enable HTTPS/TLS everywhere
- [ ] Configure firewall rules
- [ ] Set up intrusion detection (Fail2ban)
- [ ] Regular security updates
- [ ] Automated backups with encryption
- [ ] Monitor security logs
- [ ] Implement disaster recovery plan

### Operations

- [ ] Rotate secrets regularly (90 days)
- [ ] Review audit logs weekly
- [ ] Perform security scans monthly
- [ ] Update dependencies monthly
- [ ] Test backups quarterly
- [ ] Security training for team
- [ ] Incident response drills

---

## Incident Response

### Incident Response Plan

**1. Detection:**
- Monitor alerts and logs
- Investigate anomalies
- Verify incidents

**2. Containment:**
- Isolate affected systems
- Revoke compromised credentials
- Block malicious IPs

**3. Eradication:**
- Remove malware/backdoors
- Patch vulnerabilities
- Update firewall rules

**4. Recovery:**
- Restore from backups
- Verify system integrity
- Resume normal operations

**5. Post-Incident:**
- Document incident
- Update procedures
- Implement preventive measures

### Emergency Contacts

```
Security Team: security@taskflow.com
On-Call: +1-XXX-XXX-XXXX
Backup: backup@taskflow.com
```

### Common Scenarios

**Compromised JWT Secret:**
```bash
# 1. Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Update environment variable
export JWT_SECRET="new-secret"

# 3. Restart application
kubectl rollout restart deployment/backend

# 4. Invalidate all existing tokens
redis-cli FLUSHDB  # If using Redis for blacklist

# 5. Notify users to re-login
```

**Database Breach:**
```bash
# 1. Isolate database
ufw deny from any to any port 5432

# 2. Review audit logs
psql -c "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100"

# 3. Change database password
ALTER USER taskflow_user WITH PASSWORD 'new-password';

# 4. Review and revoke suspicious sessions
DELETE FROM user_sessions WHERE created_at < NOW() - INTERVAL '1 hour';

# 5. Restore from backup if needed
pg_restore -d taskflow backup.dump
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets are strong and unique
- [ ] Environment variables are set correctly
- [ ] SSL/TLS certificates are valid
- [ ] Firewall rules are configured
- [ ] Database uses SSL connections
- [ ] Backups are encrypted
- [ ] Rate limiting is enabled
- [ ] Security headers are set
- [ ] Audit logging is enabled
- [ ] Monitoring alerts are configured

### Post-Deployment

- [ ] Security scan completed
- [ ] Penetration testing performed
- [ ] Vulnerability assessment done
- [ ] Access controls verified
- [ ] Backups tested
- [ ] Disaster recovery tested
- [ ] Team trained on security procedures
- [ ] Documentation updated
- [ ] Incident response plan reviewed

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**Last Updated:** October 8, 2025
**Version:** 1.0
**Maintained By:** TaskFlow Security Team

For security issues, please email: security@taskflow.com
