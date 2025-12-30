# Testing and Security Issues - Action Plan

**Created:** 2025-12-30
**Status:** Needs Resolution

## Table of Contents
1. [Unit Test Failures](#unit-test-failures)
2. [Security Vulnerabilities](#security-vulnerabilities)
3. [Action Plan for Next Session](#action-plan-for-next-session)

---

## Unit Test Failures

### Issue 1: Mock Hoisting Error in auth.test.js

**File:** `app/backend/src/middleware/auth.test.js:8`
**Error:**
```
ReferenceError: Cannot access 'mockSign' before initialization
```

**Root Cause:**
- Vitest hoists `vi.mock()` calls to the top of the file
- Variables defined before `vi.mock()` are not accessible in the factory function
- This is a known Vitest limitation with mock factories

**Current Code Issue:**
The mock is trying to reference variables that aren't available during hoisting.

**Solution for Next Session:**
1. Use `vi.mocked()` after imports instead of factory functions
2. OR define all mocks inline within the factory
3. Verify the fix works both locally AND in GitHub Actions

---

### Issue 2: taskController.test.js - Multiple Assertion Failures

**File:** `app/backend/src/controllers/taskController.test.js`

#### 2.1: createTask - Status Not Called (Line 82)
```
AssertionError: expected "vi.fn()" to be called with arguments: [ 201 ]
Number of calls: 0
```
**Cause:** Controller not calling `res.status(201)` - possibly throwing error before reaching response

#### 2.2: getTasks - Wrong Response Format (Line 112)
```
Expected: { tasks: [...] }
Received: { tasks: [...], count: 2 }
```
**Cause:** Controller now returns count along with tasks - test needs updating

#### 2.3: getTask - Parameter Type Mismatch (Line 146)
```
Expected: [ 1, 1 ]
Received: [ "1", 1 ]
```
**Cause:** `req.params.id` is a string from URL, test expects number

#### 2.4: updateTask - Task.update Not Called (Line 187)
```
AssertionError: expected "vi.fn()" to be called with arguments: [ 1, 1, {...} ]
Number of calls: 0
```
**Cause:** Missing `findByIdAndUserId` mock - controller checks existence first

#### 2.5: updateTask - 404 Not Called (Line 202)
```
AssertionError: expected "vi.fn()" to be called with arguments: [ 404 ]
Number of calls: 0
```
**Cause:** Task.update returning null, but controller might not handle it properly

#### 2.6: deleteTask - Task.delete Not Called (Line 225)
```
AssertionError: expected "vi.fn()" to be called with arguments: [ 1, 1 ]
Number of calls: 0
```
**Cause:** Missing `findByIdAndUserId` mock - controller checks existence first

#### 2.7: deleteTask - 404 Not Called (Line 235)
```
AssertionError: expected "vi.fn()" to be called with arguments: [ 404 ]
Number of calls: 0
```
**Cause:** Task.delete returning null, but test expects 404 response

#### 2.8: getStatistics - Wrong Response Format (Line 263)
```
Expected: { statistics: { total: 10, ... } }
Received: { total: 10, ... }
```
**Cause:** Response format changed - statistics not wrapped in object

**Solution for Next Session:**
1. Review actual controller implementation
2. Update ALL test mocks to match controller behavior
3. Update ALL test assertions to match actual response formats
4. Ensure tests pass locally before pushing to GitHub

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
- [ ] All `auth.test.js` tests pass locally
- [ ] All `taskController.test.js` tests pass locally
- [ ] All `authController.test.js` tests pass locally
- [ ] Full test suite passes locally: `npm test`
- [ ] GitHub Actions tests pass (check CI/CD)
- [ ] Test coverage maintained or improved

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

**Total Issues:** 23 security vulnerabilities + 8 test failures = 31 issues

**By Priority:**
- 🔴 **Critical (Test Failures):** 8 issues - MUST FIX FIRST
- 🟠 **High (Security):** 4 issues - Docker images + glob
- 🟡 **Medium (Security):** 11 issues - Base image dependencies
- 🟢 **Low (Security):** 8 issues - Optional improvements

**Estimated Total Time:** 75-105 minutes for all phases

**Recommended Order:**
1. Fix unit tests (blocks deployment)
2. Update Docker base images (addresses majority of security issues)
3. Fix npm dependencies (addresses glob vulnerability)
4. Update documentation (ensures maintainability)
