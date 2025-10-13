import winston from 'winston'
import config from '../config/index.js'

const { combine, timestamp, printf, colorize, errors } = winston.format

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`
  if (stack) {
    msg += `\n${stack}`
  }
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`
  }
  return msg
})

// Create logger
const logger = winston.createLogger({
  level: config.log.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
})

// Create logs directory if it doesn't exist
import fs from 'fs'
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs')
}

export default logger
