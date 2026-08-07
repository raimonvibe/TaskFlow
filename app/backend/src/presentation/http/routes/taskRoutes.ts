import express, { type RequestHandler, type Router } from 'express'
import type { TaskController } from '../controllers/TaskController.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createTaskValidation,
  listTasksValidation,
  taskIdValidation,
  updateTaskValidation,
} from '../validators/taskValidators.js'

export interface TaskRoutesDependencies {
  readonly controller: TaskController
  readonly authenticate: RequestHandler
}

/**
 * Wires the task endpoints, taking its dependencies as arguments the same
 * way `createAuthRouter` does.
 *
 * `router.use(authenticate)` covers every route in the file rather than
 * each route opting in - so a route added later is authenticated by
 * default, and forgetting is not one of the available mistakes. The
 * authorization suite asserts a 401 on all six paths with no token.
 *
 * `/stats` is registered before `/:id` and has to stay there: Express
 * matches in declaration order, and the other way round `/:id` would
 * swallow "stats" as an id.
 */
export function createTaskRouter(deps: TaskRoutesDependencies): Router {
  const router = express.Router()

  router.use(deps.authenticate)

  router.get('/', listTasksValidation, validateRequest, deps.controller.list)
  router.get('/stats', deps.controller.stats)
  router.get('/:id', taskIdValidation, validateRequest, deps.controller.get)
  router.post('/', createTaskValidation, validateRequest, deps.controller.create)
  router.put('/:id', updateTaskValidation, validateRequest, deps.controller.update)
  router.delete('/:id', taskIdValidation, validateRequest, deps.controller.remove)

  return router
}
