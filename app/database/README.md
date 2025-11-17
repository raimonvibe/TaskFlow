# TaskFlow Database

PostgreSQL database schema and migrations for TaskFlow.

## Overview

This directory contains:
- **schema.sql**: Complete database schema
- **migrations/**: Individual migration files
- **init.sql**: Docker initialization script
- **seed.js**: Sample data for development/testing

## Database Schema

### Users Table
Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique user ID |
| name | VARCHAR(255) | NOT NULL | User's full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

### Tasks Table
Stores user tasks and to-dos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique task ID |
| user_id | INTEGER | FK users(id), NOT NULL | Task owner |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | TEXT | NULLABLE | Task details |
| status | task_status | DEFAULT 'todo' | todo, in_progress, completed |
| priority | task_priority | DEFAULT 'medium' | low, medium, high |
| due_date | TIMESTAMP | NULLABLE | When task is due |
| created_at | TIMESTAMP | DEFAULT NOW() | Task creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

### Indexes

Performance-optimized indexes:
- `idx_users_email` - Fast email lookups for authentication
- `idx_tasks_user_id` - Fast task queries by user
- `idx_tasks_status` - Filter tasks by status
- `idx_tasks_priority` - Filter tasks by priority
- `idx_tasks_due_date` - Sort/filter by due date
- `idx_tasks_created_at` - Sort by creation date

## Setup Instructions

### Option 1: Using schema.sql (Quick Setup)

For local development:

```bash
# Create database
createdb taskflow

# Run schema
psql -d taskflow -f schema.sql

# Run seed data (optional)
cd ../backend
npm run seed
```

### Option 2: Using Migrations (Recommended for Production)

The backend uses `node-pg-migrate` for migration management.

```bash
cd ../backend

# Run all migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create add_new_feature
```

### Option 3: Using Docker (Easiest)

The `init.sql` script runs automatically when using Docker Compose:

```bash
# From project root
docker-compose up -d postgres

# Database is automatically initialized
```

## Seeding Data

To populate the database with sample data:

```bash
cd ../backend
npm run seed
```

This creates:
- Demo user account
  - Email: `demo@taskflow.com`
  - Password: `demo123`
- 10 sample tasks with various statuses and priorities

## Migration Files

Migrations are located in `migrations/`:

1. `1_create_users_table.sql` - Creates users table
2. `2_create_tasks_table.sql` - Creates tasks table with enums
3. `3_create_updated_at_trigger.sql` - Auto-update timestamps

## Maintenance

### Backup

```bash
# Backup entire database
pg_dump taskflow > backup.sql

# Backup only schema
pg_dump -s taskflow > schema_backup.sql

# Backup only data
pg_dump -a taskflow > data_backup.sql
```

### Restore

```bash
psql taskflow < backup.sql
```

### Reset Database

```bash
# Drop and recreate
dropdb taskflow
createdb taskflow
psql -d taskflow -f schema.sql
```

## Connection Strings

### Local Development
```
postgresql://postgres:postgres@localhost:5432/taskflow
```

### Docker Compose
```
postgresql://taskflow_user:taskflow_password@postgres:5432/taskflow
```

### Production
Set these environment variables in your backend `.env`:
```
DB_HOST=your-host
DB_PORT=5432
DB_NAME=taskflow
DB_USER=your-user
DB_PASSWORD=your-secure-password
```

## Performance Tuning

For production, consider:

1. **Connection Pooling**: Configured in backend (`max: 20`)
2. **Index Optimization**: All critical queries are indexed
3. **Query Analysis**: Use `EXPLAIN ANALYZE` for slow queries
4. **Regular VACUUM**: PostgreSQL auto-vacuum is enabled
5. **Monitoring**: Track connection count and slow queries

## Security

- Passwords are hashed with bcrypt (cost factor: 10)
- User emails are unique (prevents duplicates)
- Foreign key constraints ensure data integrity
- ON DELETE CASCADE removes tasks when user is deleted
- Connection pooling prevents connection exhaustion
- Prepared statements prevent SQL injection

## Troubleshooting

### Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -d taskflow -c "SELECT 1;"
```

### Permission Issues

```bash
# Grant all privileges
psql -d taskflow -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskflow_user;"
```

### Migration Errors

```bash
# Check migration status
npm run migrate:status

# Force unlock (if stuck)
# Manually delete row from pgmigrations table
```

## Future Enhancements

Potential schema additions:
- Tags/labels for tasks
- Task comments/activity log
- File attachments
- User roles and permissions
- Task sharing between users
- Recurring tasks
- Task dependencies

## License

MIT
