# How to handle security issues still shown

This guide explains what to do when GitHub Security still shows alerts after you have applied the remediation (npm overrides, Dockerfile updates) and re-run the Security Scan.

---

## 1. Run these first (one-time)

Before re-checking alerts, ensure the fixes are in the repo and the Security Scan has run on the latest code.

1. **Apply the remediation** (if not already done):
   - npm overrides in `app/backend/package.json` and `app/frontend/package.json` (see [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md)).
   - Dockerfile updates in `app/backend/Dockerfile` and `app/frontend/Dockerfile` (apk upgrade, .npmrc copy for frontend).

2. **Commit and push** so the default branch has the fixes:
   ```bash
   git add app/backend/package.json app/backend/package-lock.json app/backend/Dockerfile \
           app/frontend/package.json app/frontend/package-lock.json app/frontend/Dockerfile app/frontend/.npmrc
   git commit -m "Security: npm overrides and Docker image upgrades"
   git push origin main
   ```

3. **Re-run the Security Scan** so GitHub gets new results:
   - Go to **Actions** → **Security Scan** → **Run workflow** → Run workflow.
   - Wait for the run to finish (dependency-scan, docker-image-scan, secret-scan; codeql-analysis may be skipped or set to continue-on-error).

---

## 2. Why “previous errors” still show

- **Alerts are from past scans.** GitHub Security shows results from the last run of each tool (Trivy, Dependabot, CodeQL). Until a **new** run completes and uploads new SARIF/results, the same alerts stay visible.
- **CodeQL disabled.** If you turned off the “Default setup” for Code scanning (to avoid the “advanced configurations” error), CodeQL may no longer run. That is expected; the Security Scan workflow’s CodeQL job can still run when the default setup is off.
- **Docker scan uses newly built images.** The Security Scan workflow builds images from the current Dockerfiles and lockfiles, then runs Trivy on those images. So a successful run **after** your push uses the fixed images; the “previous” alerts were from an older run before the fix.

---

## 3. After a successful Security Scan run

1. **Open Security**  
   Repo → **Security** → **Code security and analysis** (or **Code scanning** / **Dependabot**).

2. **See which alerts are still open**  
   Check:
   - **Code scanning** (Trivy, CodeQL): Alerts from the **latest** uploaded run. If the run that just finished uploaded new SARIF, the list should update (some alerts may disappear).
   - **Dependabot**: Separate; it opens PRs or shows alerts from dependency checks. Closing PRs or updating dependencies updates these.

3. **If the same alerts still appear**  
   - **Trivy (container/dependency):** Confirm the **latest** workflow run (the one you just triggered) completed the “docker-image-scan” (and optionally dependency) steps and uploaded SARIF. If the run failed before upload, fix the workflow (e.g. frontend build, PostCSS/Tailwind) and push, then run the Security Scan again.
   - **CodeQL:** If you disabled the default setup, only the workflow’s CodeQL job uploads results. Ensure that job runs and uploads; if it’s `continue-on-error: true`, the run can still succeed while CodeQL fails (e.g. “advanced configurations” conflict). Resolve that conflict or accept no CodeQL results until it’s fixed.

---

## 4. How to close or dismiss alerts

- **Alert is fixed (e.g. CVE no longer in the new scan)**  
  Open the alert → **Dismiss** → choose **“Fixed”** (or equivalent) and add a short note, e.g.  
  *“Remediated: Docker images rebuilt with apk upgrade; npm overrides applied. See SECURITY_REMEDIATION_PLAN.md.”*

- **Alert is from an old run and you’ve applied the fix**  
  Same as above: dismiss as **“Fixed”** with a note that remediation is in place and the next scan will reflect it.

- **Alert is not fixed yet**  
  Either fix it (follow SECURITY_REMEDIATION_PLAN.md or the CVE advisory) or dismiss with **“Won’t fix”** / **“Risk accepted”** and a brief reason.

- **Duplicate or false positive**  
  Dismiss with **“Used in tests”** or **“Not used”** (or your org’s equivalent) and a one-line explanation.

---

## 5. Checklist when “previous errors” remain

| Step | Action |
|------|--------|
| 1 | Confirm the latest commit on `main` includes Dockerfile and package.json/package-lock.json changes. |
| 2 | Trigger **Actions** → **Security Scan** → **Run workflow** and wait for it to finish. |
| 3 | If the run fails (e.g. frontend Docker build), fix the failure, push, and run the Security Scan again. |
| 4 | In **Security** → **Code scanning**, check that the **latest** run’s results are present (e.g. “docker-frontend”, “docker-backend”). |
| 5 | For each alert still open: either fix and re-scan, or dismiss with “Fixed” / “Won’t fix” and a short note. |

---

## 6. CodeQL: disabled default setup

- **If you disabled the default setup** to fix “CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled”: only the **workflow’s** CodeQL job will upload results. Ensure that job runs and that there is no other “default” CodeQL run conflicting with it.
- **If the workflow’s CodeQL step still fails:** leave it with `continue-on-error: true` so the rest of the Security Scan (Trivy, secret scan, dependency scan) still runs. You can fix CodeQL later (e.g. align with GitHub’s default setup or remove the job).

---

## 7. References

- Full remediation steps: [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md)
- GitHub: **Security** → **Code security and analysis**
- Workflow: **Actions** → **Security Scan**
