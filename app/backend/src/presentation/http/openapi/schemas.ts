import { TaskPriority } from '../../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js'
import type { TaskResponse } from '../dto/taskResponse.js'
import type { UserCredentialsResponse, UserProfileResponse } from '../dto/userResponse.js'

/** The subset of JSON Schema this API actually uses. Hand-rolled rather than
 * pulled from `openapi-types`, because a dozen optional fields are cheaper to
 * maintain than a dependency whose only job is to describe them. */
export interface SchemaObject {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  format?: string
  nullable?: boolean
  enum?: readonly string[]
  description?: string
  items?: SchemaObject
  properties?: Record<string, SchemaObject>
  required?: readonly string[]
  minLength?: number
  maxLength?: number
  example?: unknown
  $ref?: string
}

/**
 * The load-bearing type in this file.
 *
 * A mapped type over `Required<T>` means the schema must name **every** field
 * of the DTO and **only** its fields. Add `archived` to `TaskResponse` and
 * this file stops compiling until it is documented; rename `due_date` and the
 * stale key is rejected as an excess property. That is what "generated from
 * the DTOs" buys - not less typing, but documentation that cannot silently
 * fall out of date, enforced by `npm run typecheck` in CI.
 *
 * TypeScript types are erased at runtime, so nothing can reflect over an
 * interface to emit this automatically. Pinning the *keys* to the type is the
 * strongest link available without moving the whole API to a runtime schema
 * library, which would mean replacing express-validator - a much larger
 * change than this phase called for.
 */
export type PropertiesOf<T> = { [K in keyof Required<T>]: SchemaObject }

const timestamp = (description: string): SchemaObject => ({
  type: 'string',
  format: 'date-time',
  nullable: true,
  description,
})

const taskProperties: PropertiesOf<TaskResponse> = {
  id: { type: 'integer', example: 42 },
  user_id: { type: 'integer', description: 'Owner. Tasks are never visible across users.' },
  title: { type: 'string', maxLength: 255, example: 'Write the deployment runbook' },
  description: { type: 'string', nullable: true },
  // Sourced from the value objects rather than retyped, so adding a status
  // updates the validator, the database enum check, and these docs together.
  status: { type: 'string', enum: TaskStatus.values() },
  priority: { type: 'string', enum: TaskPriority.values() },
  due_date: timestamp('Due date, or null when none was set.'),
  created_at: timestamp('Set by the database on insert.'),
  updated_at: timestamp('Set by the database on every update.'),
}

const userCredentialsProperties: PropertiesOf<UserCredentialsResponse> = {
  id: { type: 'integer' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
}

const userProfileProperties: PropertiesOf<UserProfileResponse> = {
  ...userCredentialsProperties,
  created_at: timestamp('When the account was registered.'),
}

export const Task: SchemaObject = {
  type: 'object',
  properties: taskProperties,
  required: Object.keys(taskProperties),
}

export const UserCredentials: SchemaObject = {
  type: 'object',
  description: 'The user shape returned by /register and /login.',
  properties: userCredentialsProperties,
  required: Object.keys(userCredentialsProperties),
}

export const UserProfile: SchemaObject = {
  type: 'object',
  description: 'The fuller shape returned by /me, created_at included.',
  properties: userProfileProperties,
  required: Object.keys(userProfileProperties),
}

/** Every error in this API has this shape - that uniformity is a property of
 * the single error middleware, not a convention each handler follows. */
export const ErrorResponse: SchemaObject = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['error'] },
    message: { type: 'string' },
    errors: {
      type: 'array',
      description: 'Present only on validation failures.',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['field', 'message'],
      },
    },
  },
  required: ['status', 'message'],
}
