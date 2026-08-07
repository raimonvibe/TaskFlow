/**
 * Password hashing port (Strategy - docs/BACKEND_REWRITE_PLAN.md §3).
 * bcrypt for now, via `BcryptPasswordHasher`; moving to argon2 later means a
 * new implementation of this interface and one line in the composition
 * root, with no change to `AuthService`.
 *
 * `compare` takes the plaintext and the stored hash rather than exposing
 * anything hash-format-specific, so implementations stay free to change
 * cost factors or algorithms without callers noticing.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>
  compare(plainPassword: string, passwordHash: string): Promise<boolean>
}
