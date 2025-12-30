import { User } from '../models/User.js'
import { generateToken } from '../middleware/auth.js'
import { authAttempts } from '../utils/metrics.js'
import logger from '../utils/logger.js'

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      authAttempts.inc({ type: 'register', status: 'failure' })
      return res.status(409).json({ message: 'User already exists' })
    }

    // Create new user
    const user = await User.create(name, email, password)

    // Generate token
    const token = generateToken({ id: user.id, email: user.email })

    authAttempts.inc({ type: 'register', status: 'success' })
    logger.info('User registered', { userId: user.id, email: user.email })

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    authAttempts.inc({ type: 'register', status: 'failure' })
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findByEmail(email)
    if (!user) {
      authAttempts.inc({ type: 'login', status: 'failure' })
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Verify password
    const isValidPassword = await User.comparePassword(password, user.password)
    if (!isValidPassword) {
      authAttempts.inc({ type: 'login', status: 'failure' })
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email })

    authAttempts.inc({ type: 'login', status: 'success' })
    logger.info('User logged in', { userId: user.id, email: user.email })

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    authAttempts.inc({ type: 'login', status: 'failure' })
    next(error)
  }
}

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    next(error)
  }
}
