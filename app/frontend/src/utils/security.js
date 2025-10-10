// Security utilities for frontend

// Secure token storage using httpOnly cookies (simulated with sessionStorage in development)
export const secureStorage = {
  // Store token securely
  setToken: token => {
    // In production, tokens should be stored in httpOnly cookies set by backend
    // For development, use sessionStorage (better than localStorage for XSS protection)
    try {
      sessionStorage.setItem('auth_token', token)
      // Set expiry timestamp
      const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      sessionStorage.setItem('token_expiry', expiryTime.toString())
    } catch (error) {
      console.error('Failed to store token:', error)
    }
  },

  // Retrieve token
  getToken: () => {
    try {
      const token = sessionStorage.getItem('auth_token')
      const expiry = sessionStorage.getItem('token_expiry')

      // Check if token expired
      if (expiry && Date.now() > parseInt(expiry)) {
        secureStorage.clearToken()
        return null
      }

      return token
    } catch (error) {
      console.error('Failed to retrieve token:', error)
      return null
    }
  },

  // Clear token
  clearToken: () => {
    try {
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('token_expiry')
      sessionStorage.removeItem('user')
    } catch (error) {
      console.error('Failed to clear token:', error)
    }
  },

  // Check if token exists and is valid
  hasValidToken: () => {
    const token = secureStorage.getToken()
    return token !== null && token !== undefined && token !== ''
  },
}

// XSS Prevention - Sanitize user input
export const sanitizeInput = input => {
  if (typeof input !== 'string') return input

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// Sanitize HTML to prevent XSS
export const sanitizeHTML = html => {
  const temp = document.createElement('div')
  temp.textContent = html
  return temp.innerHTML
}

// Validate URL to prevent open redirect attacks
export const isValidURL = url => {
  try {
    const parsed = new URL(url, window.location.origin)
    // Only allow same origin or explicitly whitelisted domains
    const allowedDomains = [window.location.hostname, 'localhost']
    return allowedDomains.includes(parsed.hostname)
  } catch {
    return false
  }
}

// CSRF Token generation (if implementing CSRF protection)
export const generateCSRFToken = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Validate email format
export const isValidEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Strong password validation
export const isStrongPassword = password => {
  if (password.length < 8) return false

  const checks = {
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password),
  }

  return Object.values(checks).every(check => check === true)
}

// Get password strength
export const getPasswordStrength = password => {
  let strength = 0

  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[@$!%*?&]/.test(password)) strength++

  if (strength <= 2) return 'weak'
  if (strength <= 4) return 'medium'
  return 'strong'
}

// Prevent timing attacks in string comparison
export const constantTimeCompare = (a, b) => {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Rate limiting helper for client-side
export const createRateLimiter = (maxAttempts, windowMs) => {
  const attempts = new Map()

  return key => {
    const now = Date.now()
    const record = attempts.get(key) || { count: 0, resetTime: now + windowMs }

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0
      record.resetTime = now + windowMs
    }

    record.count++
    attempts.set(key, record)

    return {
      allowed: record.count <= maxAttempts,
      remaining: Math.max(0, maxAttempts - record.count),
      resetTime: record.resetTime,
    }
  }
}

// Content Security Policy violation reporter
export const setupCSPReporting = () => {
  document.addEventListener('securitypolicyviolation', e => {
    console.error('CSP Violation:', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy,
    })

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/csp-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.error('Failed to report CSP violation:', err))
    }
  })
}

// Detect and prevent clickjacking
export const preventClickjacking = () => {
  if (window !== window.top) {
    // Page is in an iframe
    console.warn('Clickjacking attempt detected!')

    // Break out of iframe
    window.top.location = window.location
  }
}

// Secure random string generation
export const generateSecureRandom = length => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(36)).join('').substring(0, length)
}

// Input validation helpers
export const validators = {
  isAlphanumeric: str => /^[a-zA-Z0-9]+$/.test(str),
  isAlpha: str => /^[a-zA-Z]+$/.test(str),
  isNumeric: str => /^[0-9]+$/.test(str),
  isLength: (str, min, max) => str.length >= min && str.length <= max,
  matches: (str, pattern) => pattern.test(str),
}

// Escape HTML entities
export const escapeHTML = str => {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

// Unescape HTML entities
export const unescapeHTML = str => {
  const div = document.createElement('div')
  div.innerHTML = str
  return div.textContent || div.innerText || ''
}

// Prevent prototype pollution
export const safeMerge = (target, source) => {
  const result = { ...target }

  for (const key in source) {
    // Skip __proto__, constructor, prototype
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }

    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key]
    }
  }

  return result
}

// Detect suspicious patterns in user input
export const detectSuspiciousInput = input => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ]

  return suspiciousPatterns.some(pattern => pattern.test(input))
}

// Session timeout handler
export const setupSessionTimeout = (timeoutMs, onTimeout) => {
  let timeoutId

  const resetTimeout = () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(onTimeout, timeoutMs)
  }

  // Reset timeout on user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, resetTimeout, true)
  })

  // Initial timeout
  resetTimeout()

  // Cleanup function
  return () => {
    clearTimeout(timeoutId)
    events.forEach(event => {
      document.removeEventListener(event, resetTimeout, true)
    })
  }
}

// Secure form submission helper
export const secureSubmit = async (url, data, options = {}) => {
  try {
    // Add CSRF token if available
    const csrfToken = sessionStorage.getItem('csrf_token')
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    const response = await fetch(url, {
      method: options.method || 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include', // Include cookies
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Secure submit failed:', error)
    throw error
  }
}

// Initialize security features
export const initializeSecurity = () => {
  // Setup CSP reporting
  setupCSPReporting()

  // Prevent clickjacking
  preventClickjacking()

  // Clear tokens on page unload (optional, for extra security)
  window.addEventListener('beforeunload', () => {
    // Optionally clear sensitive data
    // secureStorage.clearToken()
  })

  console.log('Security features initialized')
}
