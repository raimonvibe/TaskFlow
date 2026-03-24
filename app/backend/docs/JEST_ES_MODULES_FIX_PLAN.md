# Jest ES Modules Test Failures - Fix Plan

## Problem Statement

Currently, 24 out of 67 tests are failing due to Jest's inability to properly mock ES modules. The mocks are defined but not being applied correctly when modules are imported.

**Error Pattern:**
```
TypeError: User.findById.mockRejectedValue is not a function
```

**Root Cause:**
- Jest's `jest.mock()` hoisting doesn't work the same way with ES modules as with CommonJS
- Mock factories execute before variable declarations, causing `undefined` references
- ES module imports are evaluated before `jest.mock()` calls can intercept them

## Current Test Status

### Failing Test Suites (5/5):
1. ✗ `src/controllers/authController.test.js` - 10 tests failing
2. ✗ `src/controllers/taskController.test.js` - Tests failing
3. ✗ `src/models/User.test.js` - Integration tests (require database)
4. ✗ `src/models/Task.test.js` - Integration tests (require database)
5. ✗ `src/middleware/auth.test.js` - Tests failing

### Passing Tests:
- 3 tests passing (likely simpler unit tests)

## Solution Options

### Option 1: Use Jest Experimental ES Modules Support (Recommended)

**Approach:**
Enable Jest's experimental ES module support and use `jest.unstable_mockModule()`

**Implementation:**
```javascript
// jest.config.js
export default {
  extensionsToTreatAsEsm: ['.js'],
  transform: {},
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
```

```javascript
// In test files
import { jest } from '@jest/globals'

// Use unstable_mockModule BEFORE imports
await jest.unstable_mockModule('../models/User.js', () => ({
  User: {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    comparePassword: jest.fn(),
  },
}))

// Dynamic imports after mocking
const { register } = await import('./authController.js')
const { User } = await import('../models/User.js')
```

**Pros:**
- Proper ES module support
- Clean mock syntax
- Works with modern JavaScript

**Cons:**
- Still experimental in Jest
- Requires async test setup
- All imports must be dynamic

**Estimated Effort:** 2-3 hours

---

### Option 2: Switch to Vitest (Modern Alternative)

**Approach:**
Replace Jest with Vitest, which has native ES module support

**Implementation:**
```bash
npm install -D vitest @vitest/ui
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

```javascript
// Test files - no changes needed!
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../models/User.js', () => ({
  User: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    // ... works seamlessly with ES modules
  },
}))
```

**Pros:**
- Native ES module support (no experimental flags)
- Faster than Jest
- Better dev experience
- Jest-compatible API
- Modern and actively maintained

**Cons:**
- Requires dependency change
- Team needs to learn new tool (minimal - API is similar)
- Some Jest features might differ

**Estimated Effort:** 3-4 hours (including migration)

---

### Option 3: Convert to Integration Tests with Test Database

**Approach:**
Stop mocking and use a real test database

**Implementation:**
```javascript
// test-setup.js
import { pool } from '../config/database.js'

beforeAll(async () => {
  // Run migrations
  await pool.query('CREATE TABLE IF NOT EXISTS users ...')
})

afterAll(async () => {
  // Cleanup
  await pool.end()
})
```

```javascript
// No mocks needed - real database interactions
describe('Auth Controller', () => {
  it('should register a new user', async () => {
    // Actually creates user in test DB
    const result = await register(req, res, next)

    // Verify in database
    const user = await pool.query('SELECT * FROM users WHERE email = $1', ['test@example.com'])
    expect(user.rows[0]).toBeDefined()
  })
})
```

**Pros:**
- No mocking complexity
- Tests real behavior
- More confidence in test results

**Cons:**
- Requires test database setup
- Slower test execution
- More complex CI/CD setup
- Need database cleanup between tests

**Estimated Effort:** 4-6 hours + CI/CD configuration

---

### Option 4: Use Dependency Injection Pattern

**Approach:**
Refactor controllers to accept dependencies as parameters

**Implementation:**
```javascript
// authController.js
export const createAuthController = (dependencies) => {
  const { User, generateToken, logger } = dependencies

  return {
    register: async (req, res, next) => {
      // Use injected dependencies
      const user = await User.create(...)
      const token = generateToken(...)
    },
  }
}
```

```javascript
// Test file - easy to mock
const mockDependencies = {
  User: {
    findByEmail: jest.fn(),
    create: jest.fn(),
  },
  generateToken: jest.fn(),
}

const controller = createAuthController(mockDependencies)
await controller.register(req, res, next)
```

**Pros:**
- Clean separation of concerns
- Easy to test
- No ES module issues
- Better architecture

**Cons:**
- Requires significant refactoring
- Changes application architecture
- More boilerplate code

**Estimated Effort:** 6-8 hours (complete refactor)

---

## Recommended Approach

### Primary Recommendation: Option 2 - Switch to Vitest

**Rationale:**
1. Vitest is built for modern JavaScript/TypeScript with ES modules
2. Minimal API changes (Jest-compatible)
3. Better performance and developer experience
4. Future-proof solution
5. Growing adoption in the community

### Fallback: Option 1 - Jest Experimental Support

If switching tools is not acceptable, use Jest's experimental ES module support.

## Implementation Plan

### Phase 1: Setup (30 minutes)
1. Install Vitest and dependencies
2. Create vitest.config.js
3. Update package.json scripts
4. Remove Jest dependencies

### Phase 2: Migration (2 hours)
1. Update test files to use Vitest imports
2. Change `jest.fn()` to `vi.fn()`
3. Change `jest.mock()` to `vi.mock()`
4. Update any Jest-specific syntax

### Phase 3: Verification (1 hour)
1. Run all tests
2. Fix any migration issues
3. Verify coverage reports work
4. Update CI/CD workflow

### Phase 4: Documentation (30 minutes)
1. Update README with new test commands
2. Document any API differences
3. Add testing best practices

## Acceptance Criteria

- [ ] All 67 tests passing
- [ ] Coverage reporting works
- [ ] CI/CD pipeline passes
- [ ] Test execution time < 10 seconds
- [ ] No mocking-related errors
- [ ] Documentation updated

## Timeline

- **Option 1 (Jest Experimental):** 1 day
- **Option 2 (Vitest):** 1 day
- **Option 3 (Integration Tests):** 2 days
- **Option 4 (Dependency Injection):** 2-3 days

## Next Steps

1. **Decision Required:** Choose approach (Recommendation: Vitest)
2. **Create Feature Branch:** `fix/jest-es-modules` or `feat/switch-to-vitest`
3. **Implement Solution:** Follow implementation plan
4. **Code Review:** Ensure all tests pass
5. **Merge to Main:** Update CI/CD

## References

- [Jest ES Modules Documentation](https://jestjs.io/docs/ecmascript-modules)
- [Vitest Documentation](https://vitest.dev/)
- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [ES Modules in Node.js](https://nodejs.org/api/esm.html)

## Notes

- Current Jest version may not fully support ES modules without experimental flag
- Vitest is used by Vue, Vite, Nuxt, and other modern frameworks
- Consider this an opportunity to modernize the testing stack
- Integration tests (User.test.js, Task.test.js) will still need test database regardless of approach

---

**Created:** 2025-11-17
**Status:** Pending Implementation
**Priority:** High (blocking CI/CD)
