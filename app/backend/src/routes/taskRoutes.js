import express from 'express'
import { body, param } from 'express-validator'
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStatistics,
} from '../controllers/taskController.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Validation rules
const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'completed'])
    .withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid date format'),
]

const updateTaskValidation = [
  param('id').isInt().withMessage('Invalid task ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'completed'])
    .withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid date format'),
]

const idValidation = [param('id').isInt().withMessage('Invalid task ID')]

// Routes
router.get('/', getTasks)
router.get('/stats', getStatistics)
router.get('/:id', idValidation, validate, getTask)
router.post('/', createTaskValidation, validate, createTask)
router.put('/:id', updateTaskValidation, validate, updateTask)
router.delete('/:id', idValidation, validate, deleteTask)

export default router
