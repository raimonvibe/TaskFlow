import { Email } from '../value-objects/Email.js'

export interface UserProps {
  readonly id: number
  readonly name: string
  readonly email: Email
  readonly createdAt: Date | null
  /** bcrypt hash. Only populated when the caller actually needs to verify a
   * password (i.e. login) - see `UserRepository.findByEmailWithPassword`. */
  readonly passwordHash?: string
}

/**
 * A registered user.
 *
 * Replaced the plain row object `models/User.js` handed back, where "the
 * user" was whatever columns the particular SELECT happened to include -
 * `findByEmail` returned `SELECT *` (password hash included), `findById`
 * returned four named columns. Callers had no way to tell which shape they
 * were holding, which is how a password hash ends up somewhere it shouldn't.
 *
 * Here the hash is an explicitly optional property that only the login path
 * asks for, and it never leaves this object: mapping a `User` to JSON is the
 * presentation layer's job (presentation/http/dto/userResponse.ts), so the
 * wire shape is decided in one visible place rather than by whichever
 * columns a query happened to select.
 */
export class User {
  readonly id: number
  readonly name: string
  readonly email: Email
  readonly createdAt: Date | null
  readonly passwordHash?: string

  constructor(props: UserProps) {
    this.id = props.id
    this.name = props.name
    this.email = props.email
    this.createdAt = props.createdAt
    this.passwordHash = props.passwordHash
  }

  /**
   * A copy with the password hash dropped.
   *
   * The login path is the one place that has to load the hash, and it has
   * no reason to keep holding it once the password has been checked.
   * Calling this before returning means a hash cannot reach a caller,
   * serializer, or log line by default - the wire shape is not the only
   * thing standing between it and the outside world.
   */
  withoutCredentials(): User {
    return new User({
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
    })
  }
}
