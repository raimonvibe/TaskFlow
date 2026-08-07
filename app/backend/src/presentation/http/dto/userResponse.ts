import type { User } from '../../../domain/entities/User.js'

export interface UserCredentialsResponse {
  id: number
  name: string
  email: string
}

export interface UserProfileResponse extends UserCredentialsResponse {
  created_at: Date | null
}

/**
 * The two user shapes the API returns, kept deliberately distinct because
 * the current endpoints return different ones and the frontend is out of
 * scope for this rewrite (docs/BACKEND_REWRITE_PLAN.md §6).
 *
 * `/register` and `/login` echo just id/name/email - `authController.js`
 * builds that object by hand even though the query it came from selected
 * created_at too. `/me` returns the whole row, created_at included. Mapping
 * both here means the difference is a visible decision in one file instead
 * of an accident of which columns a SELECT happened to list, and it keeps
 * snake_case at the wire boundary without leaking that convention inward.
 */
export function toCredentialsResponse(user: User): UserCredentialsResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
  }
}

export function toProfileResponse(user: User): UserProfileResponse {
  return {
    ...toCredentialsResponse(user),
    created_at: user.createdAt,
  }
}
