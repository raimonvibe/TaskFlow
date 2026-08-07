# TaskFlow Backend

Node.js/Express REST API for the TaskFlow DevOps learning project.

## Features

- **RESTful API**: Full CRUD operations for tasks
- **Authentication**: JWT-based authentication
- **Validation**: Input validation with express-validator
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Structured logging with Winston
- **Metrics**: Prometheus metrics endpoint
- **Health Checks**: Health check endpoint for monitoring
- **Database**: PostgreSQL with connection pooling
- **Error Handling**: Centralized error handling

## Technology Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Database**: PostgreSQL with node-postgres (pg)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Logging**: Winston
- **Metrics**: prom-client (Prometheus)
- **Security**: Helmet, bcryptjs, CORS, rate-limiting

## Getting Started

### Prerequisites

- Node.js 22+ and npm (`nvm use` picks it up from `.nvmrc`)
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

3. Update `.env` with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow
DB_USER=taskflow_user
DB_PASSWORD=taskflow_password
JWT_SECRET=your_random_secret_string
```

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
- `npm run dev` - Start development server (tsx watch, TypeScript entry point)
- `npm run build` - Compile TypeScript to `dist/`
- `npm run typecheck` - Type-check without emitting
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

Mid-migration: the auth endpoints run a layered TypeScript architecture,
everything else still runs the original JavaScript. See
[docs/BACKEND_REWRITE_PLAN.md](../../docs/BACKEND_REWRITE_PLAN.md) for what
moves when, and why.

```
src/
├── domain/                    # Entities, value objects, errors, events,
│   │                          #   repository interfaces. Imports nothing
│   │                          #   from the layers below.
│   ├── entities/User.ts
│   ├── value-objects/Email.ts
│   ├── errors/                # AppError hierarchy
│   ├── events/                # DomainEvent, AuthEvents
│   └── repositories/          # Interfaces only
├── application/               # Use cases; depends only on domain/
│   ├── services/              # AuthService, TokenService
│   ├── ports/                 # Interfaces infrastructure must satisfy
│   └── subscribers/           # Metrics, audit log
├── infrastructure/            # Concrete implementations of the interfaces
│   ├── persistence/postgres/  # Repositories, connection pool
│   ├── security/              # Bcrypt hashing, JWT provider
│   ├── config/Config.ts
│   ├── logging/, metrics/, events/, clock/
├── presentation/http/         # Express boundary
│   ├── app.ts                 # Middleware stack + route mounting
│   ├── controllers/, routes/, middleware/, dto/, validators/
├── composition/container.ts   # The only file that does `new`
├── main.ts                    # Entry point (npm start -> dist/main.js)
│
│   # Not yet migrated - replaced in phases 4 and 5:
├── config/                    # index.js, database.js
├── controllers/taskController.js
├── middleware/                # auth.js, requestLogger.js, validate.js
├── models/                    # Task.js, TokenBlacklist.js
├── routes/                    # taskRoutes.js, healthRoutes.js
└── utils/                     # logger.js, metrics.js
```

### Local development note

The backend container keeps `node_modules` in an anonymous Docker volume,
which is reused across image rebuilds. If the container fails to start with
`sh: tsx: not found` after pulling changes, renew that volume:

```bash
docker compose up -d --force-recreate -V backend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
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

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `taskflow` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | JWT secret key | (required) |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:5173` |

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

**Note:** Unit tests (`domain/`, `application/`, and the fakes in
`src/test/fakes/`) need no database and run in about a second - they exercise
services against in-memory implementations of the repository interfaces, with
no mocking framework involved. Integration tests (`src/test/security/*`,
`PostgresUserRepository.test.ts`, `models/Task.test.js`) do require a
PostgreSQL connection.

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
