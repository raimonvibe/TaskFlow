import type { PasswordPolicy } from '../../../domain/policies/PasswordPolicy.js'
import { TaskPriority } from '../../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js'
import { ErrorResponse, Task, UserCredentials, UserProfile, type SchemaObject } from './schemas.js'

export interface OpenApiDocument {
  openapi: string
  info: { title: string; version: string; description: string }
  servers: { url: string; description: string }[]
  components: {
    schemas: Record<string, SchemaObject>
    securitySchemes: Record<string, Record<string, string>>
  }
  paths: Record<string, Record<string, unknown>>
}

const ref = (name: string): SchemaObject => ({ $ref: `#/components/schemas/${name}` })

const json = (schema: SchemaObject): Record<string, unknown> => ({
  content: { 'application/json': { schema } },
})

const errors = (...codes: number[]): Record<string, unknown> =>
  Object.fromEntries(
    codes.map(code => [
      String(code),
      { description: ERROR_DESCRIPTIONS[code] ?? 'Error', ...json(ref('ErrorResponse')) },
    ])
  )

const countsKeyedBy = (values: readonly string[]): Record<string, SchemaObject> =>
  Object.fromEntries(values.map(value => [value, { type: 'integer' as const }]))

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Validation failed. The body names the offending fields.',
  401: 'Missing, invalid, expired, or revoked credentials.',
  404: 'No such resource, or it belongs to another user.',
  409: 'Conflicts with existing state, e.g. the email is taken.',
  429: 'Rate limited.',
  500: 'Unexpected server error.',
}

const bearer = [{ bearerAuth: [] }]

/**
 * Most successful responses are wrapped in an object with a `message`
 * alongside the payload, rather than being the payload. That is not a
 * pattern worth copying, but it is what the frontend reads, and the frontend
 * is out of scope (docs/BACKEND_REWRITE_PLAN.md §8) - so it gets documented
 * as it is.
 */
const envelope = (properties: Record<string, SchemaObject>, required: string[]): SchemaObject => ({
  type: 'object',
  properties: { message: { type: 'string' }, ...properties },
  required,
})

/**
 * The API description, assembled rather than hand-maintained: response shapes
 * come from the DTO-linked schemas, the status and priority enums from the
 * value objects, and the password rule from whichever `PasswordPolicy` the
 * container selected.
 *
 * A function, not a constant, because that last one is a runtime choice - a
 * deployment running `PASSWORD_POLICY=strong` should document the rule it
 * actually enforces rather than the default.
 *
 * Served publicly at `/api-docs.json`. That is deliberate and safe: it
 * describes the same endpoints the frontend bundle already reveals, contains
 * no keys, and documents `/metrics` only as existing, not how to open it.
 */
export function buildOpenApiDocument(passwordPolicy: PasswordPolicy): OpenApiDocument {
  return {
    openapi: '3.0.3',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description:
        'Task management API for the TaskFlow DevOps learning project. ' +
        'All errors share one envelope; see the ErrorResponse schema.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Docker Compose' },
      { url: '/', description: 'Wherever this document was fetched from' },
    ],
    components: {
      schemas: { Task, UserCredentials, UserProfile, ErrorResponse },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Liveness and database connectivity',
          description:
            'Answers 503 rather than failing when the database is unreachable, ' +
            "so the body distinguishes 'process is up' from 'process is well'.",
          responses: {
            '200': { description: 'Healthy.' },
            '503': { description: 'Up, but the database is unreachable.' },
          },
        },
      },
      '/metrics': {
        get: {
          tags: ['System'],
          summary: 'Prometheus exposition',
          description:
            'Requires the X-Metrics-Key header when METRICS_KEY is configured. ' +
            'Answers 404 rather than 401 without it, so the endpoint does not ' +
            'confirm its own existence to an unauthenticated caller.',
          responses: {
            '200': { description: 'Prometheus text exposition format.' },
            '404': { description: 'Not configured, or the key did not match.' },
          },
        },
      },
      '/api-docs.json': {
        get: {
          tags: ['System'],
          summary: 'This document',
          responses: { '200': { description: 'The OpenAPI description of this API.' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Create an account and receive access + refresh tokens',
          requestBody: {
            required: true,
            ...json({
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1 },
                email: { type: 'string', format: 'email' },
                // The one place the active policy is stated to clients.
                password: { type: 'string', description: passwordPolicy.requirement },
              },
              required: ['name', 'email', 'password'],
            }),
          },
          responses: {
            '201': {
              description: 'Account created.',
              ...json(
                envelope(
                  {
                    token: { type: 'string', description: 'Short-lived access JWT.' },
                    refresh_token: {
                      type: 'string',
                      description: 'Opaque refresh token; rotated on each /refresh.',
                    },
                    user: ref('UserCredentials'),
                  },
                  ['message', 'token', 'refresh_token', 'user']
                )
              ),
            },
            ...errors(400, 409, 429),
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Exchange credentials for access + refresh tokens',
          description:
            'Returns the same message for an unknown email and a wrong password, ' +
            'deliberately, so the endpoint cannot be used to enumerate accounts.',
          requestBody: {
            required: true,
            ...json({
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' },
              },
              required: ['email', 'password'],
            }),
          },
          responses: {
            '200': {
              description: 'Authenticated.',
              ...json(
                envelope(
                  {
                    token: { type: 'string', description: 'Short-lived access JWT.' },
                    refresh_token: {
                      type: 'string',
                      description: 'Opaque refresh token; rotated on each /refresh.',
                    },
                    user: ref('UserCredentials'),
                  },
                  ['message', 'token', 'refresh_token', 'user']
                )
              ),
            },
            ...errors(400, 401, 429),
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Rotate the refresh token and issue a new access token',
          description:
            'The presented refresh token is consumed. Presenting an already-used ' +
            'refresh token invalidates the whole token family (reuse detection).',
          requestBody: {
            required: true,
            ...json({
              type: 'object',
              properties: {
                refresh_token: { type: 'string' },
              },
              required: ['refresh_token'],
            }),
          },
          responses: {
            '200': {
              description: 'New token pair.',
              ...json(
                envelope(
                  {
                    token: { type: 'string' },
                    refresh_token: { type: 'string' },
                  },
                  ['message', 'token', 'refresh_token']
                )
              ),
            },
            ...errors(400, 401, 429),
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'The authenticated user',
          security: bearer,
          responses: {
            '200': {
              description: 'The current user.',
              ...json({
                type: 'object',
                properties: { user: ref('UserProfile') },
                required: ['user'],
              }),
            },
            ...errors(401, 404),
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Revoke the access token and all refresh tokens for the user',
          description:
            'Blacklists the presented access JWT and revokes every refresh-token ' +
            'family for the user, so both credentials die on logout.',
          security: bearer,
          responses: {
            '200': { description: 'Tokens revoked.', ...json(envelope({}, ['message'])) },
            ...errors(401),
          },
        },
      },
      '/api/tasks': {
        get: {
          tags: ['Tasks'],
          summary: "List the caller's tasks, newest first",
          security: bearer,
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: TaskStatus.values() },
            },
            {
              name: 'priority',
              in: 'query',
              schema: { type: 'string', enum: TaskPriority.values() },
            },
          ],
          responses: {
            '200': {
              description: 'Matching tasks.',
              ...json({
                type: 'object',
                properties: {
                  tasks: { type: 'array', items: ref('Task') },
                  count: { type: 'integer', description: 'Length of `tasks`.' },
                },
                required: ['tasks', 'count'],
              }),
            },
            ...errors(400, 401),
          },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create a task',
          security: bearer,
          requestBody: {
            required: true,
            ...json({
              type: 'object',
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 255 },
                description: { type: 'string', nullable: true },
                status: { type: 'string', enum: TaskStatus.values() },
                priority: { type: 'string', enum: TaskPriority.values() },
                due_date: { type: 'string', format: 'date-time', nullable: true },
              },
              required: ['title'],
            }),
          },
          responses: {
            '201': {
              description: 'Created.',
              ...json(envelope({ task: ref('Task') }, ['message', 'task'])),
            },
            ...errors(400, 401),
          },
        },
      },
      '/api/tasks/stats': {
        get: {
          tags: ['Tasks'],
          summary: 'Counts by status and priority for the caller',
          security: bearer,
          responses: {
            '200': {
              description: 'Aggregated counts.',
              ...json({
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  byStatus: {
                    type: 'object',
                    properties: countsKeyedBy(TaskStatus.values()),
                    required: TaskStatus.values(),
                  },
                  byPriority: {
                    type: 'object',
                    properties: countsKeyedBy(TaskPriority.values()),
                    required: TaskPriority.values(),
                  },
                },
                required: ['total', 'byStatus', 'byPriority'],
              }),
            },
            ...errors(401),
          },
        },
      },
      '/api/tasks/{id}': {
        get: {
          tags: ['Tasks'],
          summary: 'Fetch one task',
          security: bearer,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': {
              description: 'The task.',
              ...json({ type: 'object', properties: { task: ref('Task') }, required: ['task'] }),
            },
            ...errors(400, 401, 404),
          },
        },
        put: {
          tags: ['Tasks'],
          summary: 'Update a task',
          description: 'At least one updatable field must be present, or the request is a 400.',
          security: bearer,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            ...json({
              type: 'object',
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 255 },
                description: { type: 'string', nullable: true },
                status: { type: 'string', enum: TaskStatus.values() },
                priority: { type: 'string', enum: TaskPriority.values() },
                due_date: { type: 'string', format: 'date-time', nullable: true },
              },
            }),
          },
          responses: {
            '200': {
              description: 'Updated.',
              ...json(envelope({ task: ref('Task') }, ['message', 'task'])),
            },
            ...errors(400, 401, 404),
          },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a task',
          security: bearer,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Deleted.', ...json(envelope({}, ['message'])) },
            ...errors(400, 401, 404),
          },
        },
      },
    },
  }
}
