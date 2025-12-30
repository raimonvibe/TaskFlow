# Testing and Security Issues - Action Plan

**Created:** 2025-12-30
**Status:** Unit Tests Fixed ✅ - Security Issues Pending
**Last Updated:** 2025-12-30

## Table of Contents
1. [Unit Test Failures](#unit-test-failures)
2. [Security Vulnerabilities](#security-vulnerabilities)
3. [Action Plan for Next Session](#action-plan-for-next-session)

---

## Unit Test Failures

### Issue 1: Mock Hoisting Error in auth.test.js ✅ FIXED

**File:** `app/backend/src/middleware/auth.test.js:77,100`
**Error:**
```
ReferenceError: Cannot access 'mockVerify' before initialization
```

**Root Cause:**
- Test referenced `mockVerify` variable that didn't exist
- Should use `vi.mocked(jwt.verify)` instead

**Solution Applied:**
Changed `mockVerify.mockReturnValue(...)` to `vi.mocked(jwt.verify).mockReturnValue(...)` on lines 77 and 100.

**Status:** ✅ All auth.test.js tests now passing

---

### Issue 2: taskController.test.js - Multiple Assertion Failures ✅ FIXED

**File:** `app/backend/src/controllers/taskController.test.js`

**Root Cause:**
The controller's `updateTask` and `deleteTask` functions call `Task.findByIdAndUserId()` first to check if the task exists, but some tests weren't mocking this call.

**Solution Applied:**

#### 2.1: updateTask - 404 Test (Line 203-212)
Added `Task.findByIdAndUserId.mockResolvedValue(null)` to properly test 404 response.

#### 2.2: updateTask - Error Handling Test (Line 215-224)
Added `Task.findByIdAndUserId.mockResolvedValue({ id: 1, status: 'todo' })` so the controller proceeds to `Task.update()` which throws the error.

#### 2.3: deleteTask - 404 Test (Line 242-249)
Added `Task.findByIdAndUserId.mockResolvedValue(null)` to properly test 404 response.

#### 2.4: deleteTask - Error Handling Test (Line 253-261)
Added `Task.findByIdAndUserId.mockResolvedValue({ id: 1, status: 'todo' })` so the controller proceeds to `Task.delete()` which throws the error.

**Status:** ✅ All 15 taskController.test.js tests now passing

---

## Security Vulnerabilities

### Critical Issues: None ✅
All critical issues from previous scan have been resolved.

### High Severity (4 issues)

#### H1: libpng Vulnerabilities (3 issues)
- **#72:** LIBPNG out-of-bounds read in png_image_read_composite
- **#71:** LIBPNG heap buffer overflow
- **#70:** LIBPNG buffer overflow

**Location:** Docker base image (`library/taskflow-frontend:1`)
**Impact:** Affects frontend Docker container base image
**Remediation:**
- Update base image in `app/frontend/Dockerfile`
- Consider using Alpine-based Node images
- Update to latest LTS Node.js version

#### H2: glob Command Injection Vulnerability (#67)
**CVE:** Command Injection via Malicious Filenames
**Location:** `usr/.../glob/package.json`
**Impact:** npm dependency vulnerability
**Remediation:**
- Run `npm audit fix --force`
- If auto-fix unavailable, update glob manually or find alternative
- Check if glob is a direct or transitive dependency

---

### Medium Severity (11 issues)

#### M1: libpng Additional Vulnerabilities (2 issues)
- **#74:** LIBPNG heap buffer over-read
- **#73:** LIBPNG heap buffer overflow via malformed palette index

**Location:** Docker base image
**Remediation:** Same as H1 - update base image

#### M2: c-ares Denial of Service (#69)
**Issue:** Denial of Service due to query termination after maximum attempts
**Location:** Docker base image (`library/taskflow-frontend:1`)
**Remediation:** Update Node.js base image (c-ares is a Node.js dependency)

#### M3: BusyBox netstat Vulnerabilities (6 issues)
- **#59, #57, #55** (frontend)
- **#65, #63, #61** (backend)

**Issue:** Local users can launch network flooding
**Location:** Docker base image BusyBox utilities
**Remediation:**
- Use minimal base images without BusyBox
- Consider distroless or Alpine without BusyBox
- If BusyBox needed, update to patched version

#### M4: OpenSSL Vulnerabilities (3 issues)
- **#44, #35:** Timing side-channel in SM2 algorithm on 64-bit ARM
- **#43, #34:** Out-of-bounds read & write in RFC 3211 KEK Unwrap

**Location:** Docker base image OpenSSL library
**Remediation:** Update Node.js base image to latest patch version

#### M5: expat XML Parser Vulnerability (#42)
**Issue:** Large dynamic memory allocation via small document
**Location:** Docker base image
**Remediation:** Update base image

---

### Low Severity (8 issues)

#### L1: BusyBox tar Vulnerabilities (6 issues)
- **#60, #58, #56** (frontend)
- **#66, #64, #62** (backend)

**Issue:** TAR archive can have filenames hidden from listing
**Impact:** Low - requires malicious TAR archive processing
**Remediation:** Update BusyBox or remove if not needed

#### L2: OpenSSL no_proxy Vulnerability (2 issues)
- **#45, #36**

**Issue:** Out-of-bounds read in HTTP client no_proxy handling
**Impact:** Low - specific edge case
**Remediation:** Update OpenSSL via base image update

---

## Action Plan for Next Session

### Phase 1: Fix Unit Tests (Priority: CRITICAL)
**Estimated Time:** 30-45 minutes

1. **Fix auth.test.js mock hoisting**
   ```javascript
   // BEFORE (doesn't work)
   const mockSign = vi.fn()
   vi.mock('jsonwebtoken', () => ({ sign: mockSign }))

   // AFTER (correct approach)
   vi.mock('jsonwebtoken')
   import jwt from 'jsonwebtoken'
   vi.mocked(jwt.sign).mockReturnValue('token')
   ```

2. **Fix taskController.test.js - systematic approach**
   - Read actual controller implementation first
   - Update test mocks to match controller logic
   - Update test assertions to match actual responses
   - Test locally: `npm test -- taskController.test.js`
   - Verify all 15 tests pass

3. **Commit and push test fixes**
   - Run full test suite locally first
   - Only push when ALL tests pass locally
   - Monitor GitHub Actions for CI test results

---

### Phase 2: Fix Docker Security Vulnerabilities (Priority: HIGH)
**Estimated Time:** 20-30 minutes

1. **Update Dockerfile base images**

   **Frontend (`app/frontend/Dockerfile`):**
   ```dockerfile
   # CURRENT (check what version is used)
   FROM node:20-alpine

   # UPDATE TO (latest LTS with security patches)
   FROM node:20.11-alpine3.19
   ```

   **Backend (`app/backend/Dockerfile`):**
   ```dockerfile
   # UPDATE TO latest LTS Alpine
   FROM node:20.11-alpine3.19
   ```

2. **Consider distroless for production**
   ```dockerfile
   # Multi-stage build example
   FROM node:20.11-alpine3.19 AS builder
   # ... build steps ...

   FROM gcr.io/distroless/nodejs20-debian12
   # ... minimal runtime ...
   ```

3. **Rebuild and scan images**
   ```bash
   docker build -t taskflow-frontend:latest app/frontend
   docker build -t taskflow-backend:latest app/backend

   # Scan with Trivy locally
   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
     aquasec/trivy image taskflow-frontend:latest
   ```

---

### Phase 3: Fix npm Dependencies (Priority: HIGH)
**Estimated Time:** 15-20 minutes

1. **Run npm audit and fix**
   ```bash
   cd app/frontend
   npm audit
   npm audit fix
   npm audit fix --force  # If needed

   cd ../backend
   npm audit
   npm audit fix
   npm audit fix --force  # If needed
   ```

2. **Handle glob vulnerability specifically**
   ```bash
   # Check if glob is direct or transitive dependency
   npm ls glob

   # If direct dependency, update
   npm update glob

   # If transitive, update parent package
   npm update [parent-package]
   ```

3. **Test after dependency updates**
   ```bash
   npm test  # Ensure nothing broke
   npm run build  # Verify builds still work
   ```

---

### Phase 4: Update Documentation (Priority: MEDIUM)
**Estimated Time:** 10 minutes

1. **Update SECURITY.md**
   - Document fixed vulnerabilities
   - Add Docker security best practices
   - Include dependency update schedule

2. **Update README.md**
   - Add badge for security scan status
   - Document how to run security scans locally

3. **Add .trivyignore if needed**
   - Ignore false positives
   - Document why certain vulnerabilities are accepted

---

## Verification Checklist

### Unit Tests
- [x] All `auth.test.js` tests pass locally ✅
- [x] All `taskController.test.js` tests pass locally ✅
- [x] All `authController.test.js` tests pass locally ✅
- [x] Unit tests pass locally: `npm test` (33/33 unit tests passing) ✅
- [ ] GitHub Actions tests pass (check CI/CD) - Pending push
- [x] Test coverage maintained ✅

### Security Scans
- [ ] No HIGH or CRITICAL vulnerabilities in application code
- [ ] Docker base images updated to latest secure versions
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] Trivy scan passes with acceptable risk
- [ ] GitHub security scanning shows improvement

### Deployment
- [ ] Application builds successfully
- [ ] Docker images build without errors
- [ ] Integration tests pass with real database
- [ ] Application runs correctly after updates

---

## Notes for Next Session

### Important Considerations:

1. **Test Fixes Must Work in CI**
   - The tests we "fixed" are still failing in GitHub Actions
   - Need to verify fixes work in CI environment, not just locally
   - Consider running tests in Docker to match CI environment

2. **Base Image Updates May Break Build**
   - Test builds locally before pushing
   - Have rollback plan ready
   - Update one service at a time (frontend, then backend)

3. **Dependency Updates May Introduce Breaking Changes**
   - Review changelogs before updating
   - Test thoroughly after `npm audit fix --force`
   - Consider updating major versions separately

4. **Some Vulnerabilities May Be False Positives**
   - Review each Trivy alert context
   - Some base image vulnerabilities may not affect our app
   - Document accepted risks in .trivyignore with justification

### Questions to Answer:
- [ ] Why are the test fixes we made still failing in CI?
- [ ] Are we using the correct Dockerfile base images currently?
- [ ] Is glob a direct dependency or transitive?
- [ ] Can we switch to distroless images without breaking functionality?

---

## Summary

**Total Issues:** 23 security vulnerabilities + ~~8 test failures~~ = ~~31~~ 23 remaining issues

**Completed:**
- ✅ **Unit Test Failures:** All 8 issues fixed - 33/33 unit tests passing

**By Priority:**
- ~~🔴 **Critical (Test Failures):** 8 issues~~ ✅ FIXED
- 🟠 **High (Security):** 4 issues - Docker images + glob
- 🟡 **Medium (Security):** 11 issues - Base image dependencies
- 🟢 **Low (Security):** 8 issues - Optional improvements

**Next Steps:**
1. ~~Fix unit tests~~ ✅ COMPLETED
2. Commit and push test fixes to GitHub
3. Verify GitHub Actions tests pass
4. Update Docker base images (addresses majority of security issues)
5. Fix npm dependencies (addresses glob vulnerability)
6. Update documentation (ensures maintainability)
