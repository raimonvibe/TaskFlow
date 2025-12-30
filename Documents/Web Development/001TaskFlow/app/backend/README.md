# TaskFlow Backend

Node.js/Express REST API for the TaskFlow DevOps learning project.

## Features

- **RESTful API**: Full CRUD operations for tasks
- **Authentication**: JWT-based authentication with httpOnly cookies
- **Validation**: Input validation with express-validator
- **Security**: Comprehensive security features (see Security section below)
- **Logging**: Structured logging with Winston (sensitive data redaction)
- **Metrics**: Prometheus metrics endpoint
- **Health Checks**: Health check endpoint for monitoring
- **Database**: PostgreSQL with connection pooling and parameterized queries
- **Error Handling**: Centralized error handling
- **CSRF Protection**: Token-based CSRF protection for all state-changing operations

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with node-postgres (pg)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Logging**: Winston
- **Metrics**: prom-client (Prometheus)
- **Security**: Helmet, bcryptjs, CORS, rate-limiting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. **Generate secure secrets and configure environment variables:**

   **IMPORTANT:** The application requires secure environment variables and will not start without them.

   a. Generate a secure JWT secret:
   ```bash
   openssl rand -base64 64
   ```

   b. Edit `.env` file and set the required variables:
   ```env
   # REQUIRED - Application will not start without these
   JWT_SECRET=<paste_generated_secret_from_step_a>
   DB_PASSWORD=<your_secure_database_password>

   # Optional - Customize as needed
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=taskflow
   DB_USER=postgres
   NODE_ENV=development
   PORT=3000
   ```

   **Security Notes:**
   - Never use default passwords in production
   - Never commit your actual `.env` file to version control
   - Store production secrets in a secure secrets manager
   - The JWT secret should be a long, random string

4. Create database:
```bash
psql -U postgres -c "CREATE DATABASE taskflow;"
```

5. Run migrations:
```bash
npm run migrate:up
```

6. (Optional) Seed database:
```bash
npm run seed
```

7. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with coverage (using Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run migrate:up` - Run database migrations
- `npm run migrate:down` - Rollback last migration
- `npm run migrate:create <name>` - Create new migration
- `npm run seed` - Seed database with sample data

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── index.js      # Main config
│   └── database.js   # Database connection
├── controllers/      # Route controllers
│   ├── authController.js
│   └── taskController.js
├── middleware/       # Express middleware
│   ├── auth.js       # JWT authentication
│   ├── errorHandler.js
│   ├── requestLogger.js
│   └── validate.js
├── models/           # Data models
│   ├── User.js
│   └── Task.js
├── routes/           # API routes
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   └── healthRoutes.js
├── utils/            # Utility functions
│   ├── logger.js     # Winston logger
│   └── metrics.js    # Prometheus metrics
├── app.js            # Express app setup
└── server.js         # Server entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Tasks
- `GET /api/tasks` - Get all tasks (requires auth)
- `GET /api/tasks/stats` - Get task statistics (requires auth)
- `GET /api/tasks/:id` - Get single task (requires auth)
- `POST /api/tasks` - Create task (requires auth)
- `PUT /api/tasks/:id` - Update task (requires auth)
- `DELETE /api/tasks/:id` - Delete task (requires auth)

### Health & Metrics
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | JWT secret key (use `openssl rand -base64 64` to generate) | **YES** | None - app will not start |
| `DB_PASSWORD` | Database password (never use defaults in production) | **YES** | None - app will not start |
| `NODE_ENV` | Environment (development/production) | No | `development` |
| `PORT` | Server port | No | `3000` |
| `HOST` | Server host | No | `0.0.0.0` |
| `DB_HOST` | Database host | No | `localhost` |
| `DB_PORT` | Database port | No | `5432` |
| `DB_NAME` | Database name | No | `taskflow` |
| `DB_USER` | Database user | No | `postgres` |
| `JWT_EXPIRE` | JWT expiration time | No | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | No | `http://localhost:5173` |
| `DEMO_PASSWORD` | Demo user password for seed script | No | `ChangeMe123!` |

## Security

This application implements comprehensive security best practices:

### Authentication & Authorization
- **httpOnly Cookies**: Authentication tokens stored in secure httpOnly cookies (not accessible via JavaScript)
- **JWT Security**: Tokens include issuer, audience, and unique JTI claims with algorithm specification (HS256)
- **Token Blacklisting**: Revoked tokens are blacklisted with automatic cleanup (production should use Redis)
- **Secure Password Storage**: Passwords hashed with bcrypt (10 rounds)
- **Strong Password Requirements**: Minimum 8 characters with uppercase, lowercase, numbers, and special characters

### CSRF Protection
- **Token-based CSRF**: Automatic CSRF token generation and validation for all POST/PUT/DELETE/PATCH requests
- **SameSite Cookies**: Cookies set with `SameSite=strict` attribute
- **Double Submit Pattern**: CSRF token in both cookie and request header

### Input Validation & Sanitization
- **Request Validation**: All inputs validated with express-validator
- **SQL Injection Prevention**: Parameterized queries throughout (using `$1, $2` placeholders)
- **NoSQL Injection Prevention**: Request sanitization with express-mongo-sanitize
- **XSS Prevention**: Input escaping and Content Security Policy headers
- **Request Size Limits**: 100kb limit on JSON and URL-encoded payloads (DoS prevention)

### Security Headers
- **Content Security Policy (CSP)**: Strict CSP without `unsafe-inline` or `unsafe-eval`
- **HSTS**: Strict-Transport-Security header for HTTPS enforcement
- **X-Frame-Options**: Clickjacking prevention with `DENY`
- **X-Content-Type-Options**: MIME sniffing prevention with `nosniff`
- **X-XSS-Protection**: XSS filter enabled

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Auth Endpoints**: 5 attempts per 15 minutes
- **Password Reset**: 3 attempts per hour
- **Progressive Delays**: Speed limiter adds delays for excessive requests

### Logging & Monitoring
- **Sensitive Data Redaction**: Passwords, tokens, and secrets automatically redacted from logs
- **Security Event Logging**: Authentication failures, blacklisted tokens, and suspicious activity logged
- **Request Logging**: Comprehensive request/response logging with security context

### Production Recommendations
- **Use Redis** for token blacklist persistence across server restarts
- **Enable HTTPS** in production (required for secure cookie transmission)
- **Use Environment Secrets**: Store all secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- **Regular Security Audits**: Run `npm audit` regularly and keep dependencies updated
- **Monitor Logs**: Set up alerts for security events (failed auth, SQL injection attempts, etc.)

## Database Migrations

Migrations are managed with `node-pg-migrate`.

Create a new migration:
```bash
npm run migrate:create add_users_table
```

Run migrations:
```bash
npm run migrate:up
```

Rollback:
```bash
npm run migrate:down
```

## Testing

This project uses **Vitest** for testing with native ES module support.

Run all tests with coverage:
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

Interactive UI mode:
```bash
npm run test:ui
```

**Note:** Integration tests (User.test.js, Task.test.js) require a PostgreSQL database connection.
Unit tests (controller tests) use mocks and run without database dependencies.

## Docker

See the `Dockerfile` in the project root for containerized deployment.

## Monitoring

- **Health Check**: `GET /health`
- **Prometheus Metrics**: `GET /metrics`
- **Logs**: Written to `logs/` directory

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT
