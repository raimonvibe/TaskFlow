import { body, param, query } from 'express-validator'
import { TaskPriority } from '../../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js'

/** VARCHAR(255) in schema.sql. Checked here so an over-long title is a
 * named 400 rather than a driver error - see PostgresTaskRepository, which
 * catches the same condition as a backstop. */
const TITLE_MAX_LENGTH = 255

/**
 * The allowed values come from the value objects rather than from a
 * hand-typed array. taskRoutes.js repeated
 * `['todo', 'in_progress', 'completed']` four times across create and
 * update; here adding a status is one edit in TaskStatus.ts and every
 * route follows (docs/BACKEND_REWRITE_PLAN.md §1).
 */
const statuses = TaskStatus.values()
const priorities = TaskPriority.values()

export const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: TITLE_MAX_LENGTH })
    .withMessage(`Title must be at most ${TITLE_MAX_LENGTH} characters`),
  body('description').optional().trim(),
  body('status').optional().isIn(statuses).withMessage('Invalid status'),
  body('priority').optional().isIn(priorities).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid date format'),
]

export const updateTaskValidation = [
  param('id').isInt().withMessage('Invalid task ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: TITLE_MAX_LENGTH })
    .withMessage(`Title must be at most ${TITLE_MAX_LENGTH} characters`),
  body('description').optional().trim(),
  body('status').optional().isIn(statuses).withMessage('Invalid status'),
  body('priority').optional().isIn(priorities).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid date format'),
]

/**
 * New in this phase. The filters were previously passed straight to
 * Postgres, where an unrecognized value failed the `task_status` enum cast
 * and surfaced as a 500 (see the SQL-injection filter case in
 * src/test/security/injection.test.js, which asserts only that no other
 * user's rows come back). Rejecting the value at the boundary makes that a
 * 400 - the honest status for input the client got wrong.
 */
export const listTasksValidation = [
  query('status').optional().isIn(statuses).withMessage('Invalid status'),
  query('priority').optional().isIn(priorities).withMessage('Invalid priority'),
]

export const taskIdValidation = [param('id').isInt().withMessage('Invalid task ID')]
