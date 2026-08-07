import bcrypt from 'bcryptjs'
import type { PasswordHasher } from '../../application/ports/IPasswordHasher.js'

/** Cost factor. 10 is what `models/User.js` used; changing it here
 * changes it for new passwords only - bcrypt stores the cost in the hash,
 * so existing hashes keep verifying against their original factor. */
const DEFAULT_SALT_ROUNDS = 10

/** bcrypt implementation of the `PasswordHasher` port. The only file in the
 * application that knows bcrypt exists. */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds: number = DEFAULT_SALT_ROUNDS) {}

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds)
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash)
  }
}
