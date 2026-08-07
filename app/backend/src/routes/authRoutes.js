import express from 'express'
import rateLimit from 'express-rate-limit'
import { body } from 'express-validator'
import { register, login, getCurrentUser } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import config from '../config/index.js'

const router = express.Router()

// Register/login get their own tighter limiter than the generic /api/ one in
// app.js (100 req/15min is too loose to slow down credential stuffing).
// Counted per-IP, so it doesn't affect other users sharing the IP for long.
const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
})

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
]

// Routes
router.post('/register', authLimiter, registerValidation, validate, register)
router.post('/login', authLimiter, loginValidation, validate, login)
router.get('/me', authenticate, getCurrentUser)

export default router
