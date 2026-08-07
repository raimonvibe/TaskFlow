/**
 * What counts as an acceptable password.
 *
 * Strategy pattern (docs/BACKEND_REWRITE_PLAN.md §3). The rule used to be a
 * single `isLength({ min: 8, max: 128 })` sitting in the route definition,
 * which made it a property of one HTTP endpoint rather than a property of
 * the application - unreachable from anywhere else, and impossible to change
 * for a deployment without editing the route.
 *
 * Implementations live here in `domain/` rather than `infrastructure/`
 * because none of them touch the outside world: "at least eight characters"
 * is a business rule, not an integration. The composition root picks which
 * one is in force.
 */
export interface PasswordPolicy {
  /**
   * Stated positively, for the API documentation and for the 400 body when
   * a password is rejected. Phrased so it reads correctly in both places.
   */
  readonly requirement: string

  /**
   * Empty when the password is acceptable. Returns every reason rather than
   * the first, so someone fixing a password learns all of it at once
   * instead of one round trip per rule.
   */
  violations(password: string): string[]
}

/**
 * Length only - the rule this codebase has always enforced. Its
 * `requirement` string with the default bounds is byte-for-byte the message
 * `authValidators.ts` hard-coded, so the 400 body is unchanged.
 *
 * The upper bound is not arbitrary: bcrypt silently truncates at 72 bytes,
 * and rejecting long input outright is better than accepting a password
 * whose tail never mattered. It also caps the work a single request can ask
 * the hasher to do.
 */
export class LengthPasswordPolicy implements PasswordPolicy {
  constructor(
    private readonly min: number = 8,
    private readonly max: number = 128
  ) {}

  get requirement(): string {
    return `Password must be between ${this.min} and ${this.max} characters`
  }

  violations(password: string): string[] {
    const withinBounds = password.length >= this.min && password.length <= this.max
    return withinBounds ? [] : [this.requirement]
  }
}

/**
 * Length plus character variety, for deployments that want it. Opt-in via
 * `PASSWORD_POLICY=strong`, because turning it on does not migrate existing
 * accounts - their stored hashes keep verifying, and only new or changed
 * passwords are held to it.
 */
export class StrongPasswordPolicy implements PasswordPolicy {
  private readonly length: LengthPasswordPolicy

  constructor(
    private readonly min: number = 12,
    private readonly max: number = 128
  ) {
    this.length = new LengthPasswordPolicy(min, max)
  }

  get requirement(): string {
    return (
      `Password must be between ${this.min} and ${this.max} characters ` +
      'and include an uppercase letter, a lowercase letter, and a number'
    )
  }

  violations(password: string): string[] {
    const violations = this.length.violations(password)

    if (!/[A-Z]/.test(password)) violations.push('Password must include an uppercase letter')
    if (!/[a-z]/.test(password)) violations.push('Password must include a lowercase letter')
    if (!/[0-9]/.test(password)) violations.push('Password must include a number')

    return violations
  }
}
