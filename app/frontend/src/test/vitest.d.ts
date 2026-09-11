import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

// @testing-library/jest-dom ships its own `vitest` augmentation, but it still
// declares `Assertion<T>` while Vitest 5 declares `Assertion<R, T>`. Declaration
// merging requires an identical type parameter list, so the matchers are wired
// up here instead of importing '@testing-library/jest-dom/vitest'.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<
    R extends void | Promise<void> = void,
    T = unknown,
  > extends TestingLibraryMatchers<T, R> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {}
}
