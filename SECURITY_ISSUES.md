# Security issues and remediation (GitHub Advanced Security)

This document lists security findings relevant to **GitHub Advanced Security** (Dependabot, CodeQL, secret scanning) and what was fixed or should be addressed in [raimonvibe/TaskFlow](https://github.com/raimonvibe/TaskFlow).

---

## Summary

| Category | Before | After / Action |
|----------|--------|----------------|
| **Dependency vulnerabilities** | 6 (backend), 8 (frontend) | **Fixed** – `npm audit fix` applied; 0 reported |
| **Default JWT secret in production** | Fallback to hardcoded string | **Fixed** – Server throws if `JWT_SECRET` not set in production |
| **SQL injection (User.update)** | Object keys used in SQL | **Fixed** – Whitelist `name`, `email`, `password` only |
| **Dependabot config** | Invalid empty `package-ecosystem` | **Fixed** – npm + github-actions for backend, frontend, workflows |
| **Frontend `unescapeHTML`** | Uses `innerHTML = str` | **Documented** – Use only with trusted/sanitized input |

---

## 1. Dependency vulnerabilities (Dependabot / npm audit)

### Backend (before)

- **ajv** &lt; 6.14.0 – ReDoS with `$data` (moderate)
- **lodash** 4.x – Prototype pollution in `_.unset` / `_.omit` (moderate)
- **minimatch** ≤ 3.1.3 – ReDoS (high)
- **qs** ≤ 6.14.1 – DoS via arrayLimit bypass (moderate)
- **rollup** 4.x – Arbitrary file write / path traversal (high)

### Frontend (before)

- **@remix-run/router** (via react-router) – XSS via open redirects (high)
- **axios** 1.x – DoS via `__proto__` in mergeConfig (high)
- **ajv**, **lodash**, **minimatch**, **rollup** – same as above

**Remediation:** `npm audit fix` was run in both `app/backend` and `app/frontend`. Re-run after any dependency changes:

```bash
cd app/backend && npm audit
cd app/frontend && npm audit
```

---

## 2. Default JWT secret (CodeQL / secret scanning / config)

**Issue:** In `app/backend/src/config/index.js`, JWT used:

`process.env.JWT_SECRET || 'default_secret_change_in_production'`

If `JWT_SECRET` is unset in production, the app would use a known default and tokens could be forged.

**Remediation:** Config now throws at startup in production when:

- `NODE_ENV === 'production'` and  
- `JWT_SECRET` is missing or equals the default string.

Set a strong secret in production, e.g.:

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

---

## 3. SQL injection in `User.update` (CodeQL / manual review)

**Issue:** In `app/backend/src/models/User.js`, `update(id, updates)` built the `UPDATE` clause from `Object.entries(updates)` and used object **keys** directly in the SQL string. A caller passing e.g. `{ "id; DROP TABLE users;--": "x" }` could inject SQL.

**Remediation:** Update logic now allows only whitelisted columns: `name`, `email`, `password`. Any other keys in `updates` are ignored. If no allowed field is present, the function throws (no empty `UPDATE`).

---

## 4. Dependabot configuration

**Issue:** `.github/dependabot.yml` had `package-ecosystem: ""`, so Dependabot did not run for any ecosystem.

**Remediation:** Config updated to:

- **npm** for `app/backend` and `app/frontend` (weekly, labels: dependencies + backend/frontend)
- **github-actions** for repo root (weekly)

After push, check: **Security → Dependabot** for alerts and version updates.

---

## 5. Frontend: `unescapeHTML` and `innerHTML`

**Issue:** In `app/frontend/src/utils/security.js`, `unescapeHTML(str)` does `div.innerHTML = str`. If `str` is user-controlled, this can lead to XSS.

**Remediation:** No code change. The function is intended for trusted or already-sanitized content. **Do not pass user input or URL/query parameters into `unescapeHTML`.** Prefer `sanitizeHTML` (which uses `textContent`) for untrusted data.

---

## 6. Other good practices already in place

- **Task.update** – Uses an `allowedFields` whitelist; no key injection.
- **Queries** – Parameterized queries (`$1`, `$2`, …) for values.
- **Auth** – JWT with algorithm and claims checks; token blacklist; rate limiting on auth.
- **Security workflow** – `.github/workflows/security.yml` runs dependency scan, Trivy (Docker), TruffleHog (secrets), CodeQL.

---

## 7. Recommended next steps

1. **Secrets:** Ensure no real secrets are in repo or history. Use GitHub secret scanning and rotate any exposed credentials.
2. **CodeQL:** If you add more languages or paths, extend the CodeQL matrix in `security.yml` and ensure both `app/backend` and `app/frontend` are included if needed.
3. **Alerts:** In GitHub **Security → Code security and analysis**, enable Dependabot alerts and Dependabot security updates if not already.
4. **Production:** Always set `JWT_SECRET` (and DB credentials, etc.) via environment or secret manager; never commit them.

---

*Last updated to reflect fixes applied for GitHub Advanced Security (Dependabot, CodeQL, config and code review).*
