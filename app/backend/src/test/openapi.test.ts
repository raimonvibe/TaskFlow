import type { Express, Router } from 'express'
import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'
import { createContainer, type Container } from '../composition/container.js'
import { LengthPasswordPolicy, StrongPasswordPolicy } from '../domain/policies/PasswordPolicy.js'
import { createApp } from '../presentation/http/app.js'
import { buildOpenApiDocument } from '../presentation/http/openapi/document.js'

/** Express keeps its route table on an untyped `stack`; this is the shape
 * actually needed from it. */
interface RouterInternals {
  stack: { route?: { path: string; methods: Record<string, boolean> } }[]
}

const routesOf = (router: Router, prefix: string): string[] =>
  (router as unknown as RouterInternals).stack
    .filter(layer => layer.route)
    .flatMap(layer => {
      const path = layer.route!.path === '/' ? '' : layer.route!.path
      return Object.keys(layer.route!.methods).map(
        method => `${method.toUpperCase()} ${prefix}${path}`
      )
    })

const documentedOperations = (paths: Record<string, Record<string, unknown>>): string[] =>
  Object.entries(paths).flatMap(([path, operations]) =>
    Object.keys(operations).map(method => `${method.toUpperCase()} ${path}`)
  )

describe('OpenAPI document', () => {
  let container: Container
  let app: Express

  beforeAll(() => {
    container = createContainer()
    app = createApp(container)
  })

  it('is served as JSON', async () => {
    const response = await request(app).get('/api-docs.json')

    expect(response.status).toBe(200)
    expect(response.body.openapi).toBe('3.0.3')
    expect(response.body.info.title).toBe('TaskFlow API')
  })

  describe('stays in step with the routes', () => {
    // Two directions, because either alone leaves a way to be wrong: the
    // first catches documenting an endpoint that does not exist (or spelling
    // its path wrong), the second catches shipping one that is undocumented.

    it('documents nothing that is not routable', async () => {
      const probes = documentedOperations(buildOpenApiDocument(new LengthPasswordPolicy()).paths)
        // /metrics answers 404 by design when METRICS_KEY is unset, so it
        // cannot be told apart from an absent route this way. It has its own
        // tests in security/metrics.test.ts.
        .filter(operation => !operation.endsWith('/metrics'))

      expect(probes.length).toBeGreaterThan(0)

      for (const operation of probes) {
        const [method, path] = operation.split(' ') as [string, string]
        const url = path.replace('{id}', '1')

        const response =
          await request(app)[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](url)

        // 401 and 400 both mean the route exists and rejected the probe,
        // which is all this is asking. A 404 would mean the documented path
        // routes nowhere.
        expect(response.status, `${method} ${url} is documented but not routable`).not.toBe(404)
      }
    })

    it('documents every route that is mounted', () => {
      // The prefixes mirror app.ts. If one of them drifts there, the test
      // above fails instead - a documented path stops routing.
      const implemented = [
        ...routesOf(container.healthRouter, ''),
        ...routesOf(container.authRouter, '/api/auth'),
        ...routesOf(container.taskRouter, '/api/tasks'),
      ].map(operation => operation.replace('/:id', '/{id}'))

      const documented = documentedOperations(
        buildOpenApiDocument(new LengthPasswordPolicy()).paths
      )

      expect(implemented.filter(operation => !documented.includes(operation))).toEqual([])
    })
  })

  it('describes the password rule the deployment actually enforces', () => {
    const lenient = buildOpenApiDocument(new LengthPasswordPolicy())
    const strict = buildOpenApiDocument(new StrongPasswordPolicy())

    const requirementIn = (document: ReturnType<typeof buildOpenApiDocument>): string => {
      const post = document.paths['/api/auth/register']?.post as {
        requestBody: {
          content: {
            'application/json': { schema: { properties: { password: { description: string } } } }
          }
        }
      }
      return post.requestBody.content['application/json'].schema.properties.password.description
    }

    expect(requirementIn(lenient)).toBe('Password must be between 8 and 128 characters')
    expect(requirementIn(strict)).toContain('uppercase')
  })

  it('describes the task shape the API actually returns', async () => {
    // The schema keys are pinned to TaskResponse at compile time; this
    // checks the compile-time claim against a real response body.
    const { registerAndLogin, cleanupAllTestUsers } = await import('./helpers/testUser.js')
    const { token } = await registerAndLogin({ name: 'OpenAPI Probe' })

    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Documented task' })

    const documented = Object.keys(
      buildOpenApiDocument(new LengthPasswordPolicy()).components.schemas.Task!.properties!
    )

    expect(created.status).toBe(201)
    expect(Object.keys(created.body.task).sort()).toEqual(documented.sort())

    await cleanupAllTestUsers()
  })
})
