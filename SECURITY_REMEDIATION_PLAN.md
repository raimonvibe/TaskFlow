# Security remediation plan

Single plan to resolve all Trivy/GitHub security alerts for TaskFlow: **npm dependencies** (node-tar, minimatch, glob, lodash, qs, jsdiff) and **Docker image system packages** (OpenSSL, libpng, libexpat, c-ares, BusyBox).

---

## Summary of alerts

| Category   | Severity  | Source                    | Fix approach              |
|------------|-----------|---------------------------|---------------------------|
| OpenSSL    | Critical  | Docker (frontend/backend) | Base image + apk upgrade   |
| node-tar   | High      | npm (Library)             | Override to tar ≥ 7.5.10   |
| minimatch  | High      | npm (Library)             | Override to minimatch ≥ 10.2.2 |
| OpenSSL    | High      | Docker (frontend/backend) | apk upgrade openssl       |
| glob       | High      | npm (Library)             | Override to glob ≥ 11.0.0  |
| OpenSSL    | Medium    | Docker (frontend/backend) | apk upgrade openssl       |
| libpng     | High/Med  | Docker (frontend)         | apk upgrade libpng        |
| lodash     | Medium    | npm (Library)             | Override to lodash ≥ 4.17.21 |
| libexpat   | Medium/Low| Docker (frontend)         | apk upgrade expat         |
| c-ares     | Medium    | Docker (frontend)         | apk upgrade c-ares         |
| BusyBox    | Medium/Low| Docker (frontend/backend) | apk upgrade busybox        |
| qs         | Low       | npm (Library)             | Override to patched qs     |
| jsdiff     | Low       | npm (Library)             | Override to patched jsdiff  |

**Alert IDs (all):** #34–#45, #55–#67, #69–#74, #75, #77–#84, #86–#107, #108–#113, #114–#121, #122–#131, #132–#133, #134–#143 (and #140). See phases below for per-alert mapping.

---

## Phase 1: npm dependency overrides

**Goal:** Fix all Library (npm) alerts in one pass so one `npm install` and one test run suffice.

**Alerts addressed:**  
- **node-tar (High):** path traversal, hardlink bypass, Unicode/symlink issues — #77–#79, #82–#84, #107, #108–#109, #135–#137, #141–#143  
- **minimatch (High):** ReDoS — #134, #138, #139  
- **glob (High):** command injection — #67  
- **lodash (Medium):** prototype pollution — #81  
- **qs (Low):** arrayLimit / DoS — #75, #132, #133  
- **jsdiff (Low):** DoS in parsePatch/applyPatch — #80  

**Actions:**

1. **Inspect dependency tree (optional but useful)**  
   ```bash
   cd app/backend && npm ls tar minimatch glob lodash qs jsdiff
   cd app/frontend && npm ls tar minimatch glob lodash qs jsdiff
   ```

2. **Add overrides in both apps**  
   In `app/backend/package.json` and `app/frontend/package.json`, add or merge an `overrides` block (merge with any existing overrides):
   ```json
   "overrides": {
     "tar": "^7.5.10",
     "minimatch": "^10.2.2",
     "glob": "^11.0.0",
     "lodash": "^4.17.21",
     "qs": "^6.11.2",
     "jsdiff": "^5.2.0"
   }
   ```
   Confirm minimum versions against [GitHub advisories](https://github.com/advisories) or `npm audit` if advisories specify different ranges.

3. **Reinstall and verify**  
   ```bash
   cd app/backend && npm install && npm audit
   cd app/frontend && npm install && npm audit
   ```
   Run tests in both apps. Commit updated `package-lock.json` in both.

**Success criteria:** No Trivy or npm audit alerts for tar, minimatch, glob, lodash, qs, or jsdiff; `npm ls` shows patched versions.

---

## Phase 2: Docker images — system packages

**Goal:** Fix all image-level alerts (OpenSSL, libpng, libexpat, c-ares, BusyBox) by upgrading base images and system packages in both Dockerfiles.

**Alerts addressed:**  
- **OpenSSL (Critical/High/Medium/Low):** CMS IV, PKCS#12, TLS 1.3, QUIC, OCB, BIO, TimeStamp, SM2, no_proxy, etc. — #34–#36, #43–#45, #87–#106, #110–#113, #114–#121, #122–#129  
- **libpng (High/Medium):** heap buffer / over-read — #70–#74, #85, #86, #140  
- **libexpat (Medium/Low):** integer overflow, null deref, memory — #42, #130, #131  
- **c-ares (Medium):** DoS — #69  
- **BusyBox (Medium/Low):** netstat, tar — #55–#66  

**Actions:**

1. **Use current Alpine base**  
   - Backend: `node:22-alpine3.22` (or latest stable).  
   - Frontend: `nginx:alpine3.23` (or latest stable).  
   Optionally pin by digest after a good build (e.g. `node:22-alpine3.22@sha256:...`).

2. **Backend Dockerfile** (`app/backend/Dockerfile`) — runner stage  
   Upgrade system packages and install dumb-init. Example:
   ```dockerfile
   RUN apk update && apk upgrade --no-cache openssl libxml2 curl expat tiff busybox && \
     apk add --no-cache dumb-init
   ```
   If the base image includes libpng, add it: `apk upgrade --no-cache ... libpng ...`. The important part is that `apk upgrade` runs so the image gets the latest fixes for the listed packages; `busybox` fixes netstat/tar CVEs in the backend image.

3. **Frontend Dockerfile** (`app/frontend/Dockerfile`) — nginx/runtime stage  
   Full upgrade and explicit add of all Trivy-reported packages:
   ```dockerfile
   RUN apk update && apk upgrade --no-cache && \
     apk add --no-cache openssl libpng libxml2 curl expat tiff c-ares busybox
   ```
   Adjust if you already have other `apk add` lines; ensure openssl, libpng, expat, c-ares, and busybox are present at latest versions for the chosen Alpine.

4. **Rebuild and push**  
   Rebuild both images and push the tags that Trivy scans (e.g. `:1` or `:latest`).

**Success criteria:** Trivy no longer reports OpenSSL, libpng, libexpat, c-ares, or BusyBox issues on `taskflow-backend` and `taskflow-frontend` (or only acceptable residual/low findings).

---

## Phase 3: Verify and close alerts

**Goal:** Confirm fixes and close all related alerts in GitHub Security.

**Actions:**

1. **Re-run Trivy** on the new image tags and on the repo (dependency scan). Confirm Library and image alerts are resolved.
2. **Commit and push** lockfiles and Dockerfile changes. Trigger or wait for the next security scan.
3. **Close alerts** in GitHub → Security → Code security and analysis: resolve or dismiss the listed alerts with a note that remediation was done per this plan (npm overrides + Docker base/package upgrades).

**Optional:** Document the overrides in README or SECURITY.md so future dependency changes don’t drop them by mistake.

---

## Order of work (checklist)

| Step | What to do |
|------|------------|
| 1 | Add all npm overrides (tar, minimatch, glob, lodash, qs, jsdiff) in both `package.json` files. |
| 2 | Run `npm install` in backend and frontend; run `npm audit` and tests; commit lockfiles. |
| 3 | Update backend Dockerfile runner stage: `apk upgrade ... openssl ... busybox` + dumb-init. |
| 4 | Update frontend Dockerfile runtime stage: `apk upgrade` + `apk add ... openssl libpng expat c-ares busybox` (and any existing packages). |
| 5 | Rebuild both Docker images and push the tags Trivy uses. |
| 6 | Re-run Trivy; confirm all targeted alerts are resolved. |
| 7 | Commit and push; re-scan in GitHub Security and close the alerts. |

---

## References

- **Trivy:** container and dependency scanning.  
- **GitHub Security:** Code security and analysis → View alerts.  
- **Alpine security:** https://security.alpinelinux.org/  
- **npm advisories:** `npm audit`, https://github.com/advisories (search e.g. tar, minimatch, glob, lodash, qs, jsdiff).
