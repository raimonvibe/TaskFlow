# Plan for remaining security alerts (Library)

Security scan is **succeeding**. The alerts below are **Trivy Library** findings: they refer to npm packages inside the built Docker images (`usr/.../tar/package.json`, etc.). Fix them by ensuring the **overrides** are reflected in the installed dependency tree and in the images.

---

## Remaining alerts summary

| Package   | Severity | Alert IDs        | Required version | Status in repo        |
|-----------|----------|------------------|------------------|------------------------|
| **node-tar** | High   | #77–#79, #82–#84, #107–#109, #135–#137, #141–#143 | ≥ 7.5.10        | Override in both apps |
| **minimatch** | High | #134, #138, #139 | ≥ 10.2.2         | Override in both apps |
| **glob**     | High | #67              | ≥ 11.0.0         | Override in both apps |
| **jsdiff**   | Low  | #80              | patched (e.g. ≥ 5.2.0) | Override in both apps |

**Cause:** Trivy scans `node_modules` inside the image. If the **lockfile** used in the image was generated before overrides or doesn’t enforce these versions, the image can still contain vulnerable tar/minimatch/glob/jsdiff.

---

## Phase 1: Confirm overrides and lockfile

**Goal:** Ensure `package.json` overrides are applied in the lockfile so `npm ci` in Docker installs patched versions.

**1. Check overrides are present**

- **Backend** `app/backend/package.json`: `overrides` must include `"tar": "^7.5.10"`, `"minimatch": "^10.2.2"`, `"glob": "^11.0.0"`, `"jsdiff": "^5.2.0"`.
- **Frontend** `app/frontend/package.json`: same overrides (frontend already has them).

**2. Regenerate lockfiles with overrides**

From repo root:

```bash
cd app/backend && npm install && npm ls tar minimatch glob jsdiff
cd ../frontend && npm install && npm ls tar minimatch glob jsdiff
```

- Confirm that `tar` is ≥ 7.5.10, `minimatch` ≥ 10.2.2, `glob` ≥ 11.0.0, `jsdiff` patched.
- Commit updated `package-lock.json` in **both** backend and frontend if anything changed.

**3. Push and rebuild images**

- Push the commit so the default branch has the updated lockfiles.
- Trigger **Actions → Security Scan → Run workflow** (so both images are rebuilt with `npm ci` using the new lockfiles).
- After the run completes, Trivy will scan the new images; the Library findings for tar, minimatch, glob, and jsdiff should disappear or drop.

---

## Phase 2: Re-scan and close alerts

**1. Run Security Scan**

- **Actions** → **Security Scan** → **Run workflow** (on `main`).
- Wait until the workflow finishes (including docker-image-scan for frontend and backend).

**2. Check Code scanning**

- **Security** → **Code security and analysis** (or **Code scanning**).
- Open the latest Trivy (or “docker-frontend” / “docker-backend”) run and confirm whether the node-tar, minimatch, glob, and jsdiff findings are still present.

**3. Dismiss alerts**

- For each alert that no longer appears in the **latest** run: **Dismiss** with reason **“Fixed”** and a short note, e.g.  
  *“Remediated via npm overrides (tar ≥ 7.5.10, minimatch ≥ 10.2.2, glob ≥ 11.0.0, jsdiff patched). Lockfiles updated; images rebuilt. See SECURITY_REMAINING_ALERTS_PLAN.md.”*
- If an alert still appears in the latest run, check that the lockfile for that app (backend or frontend) actually pins the patched version (e.g. `npm ls tar` in that app) and that the image was rebuilt after the lockfile commit.

---

## Phase 3: If alerts persist

- Run locally (or in CI) from repo root:
  ```bash
  cd app/backend && npm ci && npm ls tar minimatch glob jsdiff
  cd ../frontend && npm ci && npm ls tar minimatch glob jsdiff
  ```
- If any of these still resolve to a vulnerable version, add or tighten the corresponding entry in `overrides` in that app’s `package.json`, run `npm install` again, commit the lockfile, push, and re-run the Security Scan.
- For **glob**: if a transitive dependency forces an old glob, the override may pull in a major version that breaks it; if so, document the risk or find an alternative dependency that uses a patched glob.

---

## Checklist

| Step | Action |
|------|--------|
| 1 | Ensure `tar`, `minimatch`, `glob`, `jsdiff` overrides exist in both `app/backend/package.json` and `app/frontend/package.json`. |
| 2 | Run `npm install` in both apps; run `npm ls tar minimatch glob jsdiff` and confirm patched versions. |
| 3 | Commit and push updated `package-lock.json` files if they changed. |
| 4 | Trigger **Security Scan** workflow and wait for it to complete. |
| 5 | In Code scanning, confirm the latest run no longer reports the Library alerts for tar, minimatch, glob, jsdiff. |
| 6 | Dismiss the listed alerts (#67, #77–#84, #107–#109, #134–#139, #141–#143, #80) as **Fixed** with the note above. |

---

## References

- Main remediation: [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md)
- Handling alerts: [SECURITY_HANDLING.md](SECURITY_HANDLING.md)
- GitHub: **Security** → **Code security and analysis**
