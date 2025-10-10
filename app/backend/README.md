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

3. Update `.env` with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow
DB_USER=postgres
DB_PASSWORD=your_password
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
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
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

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

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
