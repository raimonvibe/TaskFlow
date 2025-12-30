import { User } from '../models/User.js'
import { generateToken, blacklistToken } from '../middleware/auth.js'
import { authAttempts } from '../utils/metrics.js'
import logger from '../utils/logger.js'
import config from '../config/index.js'

// Helper function to set authentication cookie
const setAuthCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed via JavaScript (XSS protection)
    secure: config.env === 'production', // Only send over HTTPS in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  }

  res.cookie('auth_token', token, cookieOptions)
}

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

    // Generate token and set httpOnly cookie
    const token = generateToken({ id: user.id, email: user.email })
    setAuthCookie(res, token)

    authAttempts.inc({ type: 'register', status: 'success' })
    logger.info('User registered', { userId: user.id, email: user.email })

    res.status(201).json({
      message: 'User created successfully',
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

    // Generate token and set httpOnly cookie
    const token = generateToken({ id: user.id, email: user.email })
    setAuthCookie(res, token)

    authAttempts.inc({ type: 'login', status: 'success' })
    logger.info('User logged in', { userId: user.id, email: user.email })

    res.json({
      message: 'Login successful',
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

export const logout = async (req, res, next) => {
  try {
    // Blacklist the current token to prevent reuse
    if (req.token) {
      blacklistToken(req.token)
    }

    // Clear the authentication cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
    })

    logger.info('User logged out', { userId: req.user?.id })

    res.json({ message: 'Logout successful' })
  } catch (error) {
    next(error)
  }
}
