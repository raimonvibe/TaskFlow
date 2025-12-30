import express from 'express'
import { register, login, logout, getCurrentUser } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { validationSchemas } from '../middleware/security.js'

const router = express.Router()

// Routes with standardized validation from security.js
router.post('/register', validationSchemas.register, validate, register)
router.post('/login', validationSchemas.login, validate, login)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getCurrentUser)

export default router
