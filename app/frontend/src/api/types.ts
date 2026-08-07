/** Shared auth wire shapes. Snake_case on refresh_token matches the API. */

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface AuthCredentialsResponse {
  message: string
  token: string
  refresh_token: string
  user: AuthUser
}

export interface RefreshResponse {
  message: string
  token: string
  refresh_token: string
}

export interface CurrentUserResponse {
  user: AuthUser & { created_at?: string | null }
}
