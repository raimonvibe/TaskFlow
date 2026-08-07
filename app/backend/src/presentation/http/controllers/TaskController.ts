import type { NextFunction, Request, Response } from 'express'
import type { TaskService } from '../../../application/services/TaskService.js'
import { requireUserId } from '../currentUser.js'
import { toTaskResponse } from '../dto/taskResponse.js'

/**
 * HTTP adapter for `TaskService`, in the same shape as `AuthController`:
 * read values off the request, call one service method, write the result.
 *
 * Compared with `taskController.js` this loses the metrics calls, the log
 * lines, the hand-written 404 branches, and - in `update` and `delete` -
 * the extra "does this exist" read that was there to support them. What is
 * left is the mapping between HTTP and the service, which is all a
 * controller should be.
 *
 * The response bodies are byte-for-byte what the old controller produced,
 * because the frontend is out of scope for this rewrite.
 */
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tasks = await this.taskService.listTasks(requireUserId(req), {
        status: asFilter(req.query.status),
        priority: asFilter(req.query.priority),
      })

      res.json({ tasks: tasks.map(toTaskResponse), count: tasks.length })
    } catch (error) {
      next(error)
    }
  }

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await this.taskService.getTask(taskId(req), requireUserId(req))
      res.json({ task: toTaskResponse(task) })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await this.taskService.createTask(requireUserId(req), toCreateInput(req.body))

      res.status(201).json({
        message: 'Task created successfully',
        task: toTaskResponse(task),
      })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await this.taskService.updateTask(
        taskId(req),
        requireUserId(req),
        toUpdateInput(req.body)
      )

      res.json({
        message: 'Task updated successfully',
        task: toTaskResponse(task),
      })
    } catch (error) {
      next(error)
    }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.taskService.deleteTask(taskId(req), requireUserId(req))
      res.json({ message: 'Task deleted successfully' })
    } catch (error) {
      next(error)
    }
  }

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(await this.taskService.getStatistics(requireUserId(req)))
    } catch (error) {
      next(error)
    }
  }
}

/** Safe because every route carrying `:id` runs `param('id').isInt()`
 * first, so a non-integer is already a 400 by the time a handler runs. */
function taskId(req: Request): number {
  return Number.parseInt(req.params.id as string, 10)
}

interface TaskRequestBody {
  title?: unknown
  description?: unknown
  status?: unknown
  priority?: unknown
  due_date?: unknown
}

/**
 * Only the fields the API accepts are read out of the body, one by one.
 * `user_id` is not among them and never can be, which is what makes the
 * mass-assignment cases in src/test/security/authorization.test.js hold as
 * a property of the design rather than as a whitelist to maintain.
 */
function toCreateInput(body: TaskRequestBody): {
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  dueDate?: string | null
} {
  return {
    title: asText(body.title) ?? '',
    description: asText(body.description),
    status: asText(body.status),
    priority: asText(body.priority),
    dueDate: asText(body.due_date),
  }
}

/**
 * Absent keys stay absent. A PUT that does not mention `description` must
 * not be turned into "set the description to null" - `TaskService` relies
 * on `undefined` to tell those apart.
 */
function toUpdateInput(body: TaskRequestBody): {
  title?: string
  description?: string | null
  status?: string | null
  priority?: string | null
  dueDate?: string | null
} {
  return {
    ...(body.title !== undefined && { title: asText(body.title) ?? '' }),
    ...(body.description !== undefined && { description: asText(body.description) }),
    ...(body.status !== undefined && { status: asText(body.status) }),
    ...(body.priority !== undefined && { priority: asText(body.priority) }),
    ...(body.due_date !== undefined && { dueDate: asText(body.due_date) }),
  }
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** Express parses repeated query parameters into arrays; only a plain
 * string is a filter. */
function asFilter(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}
