/**
 * Populates an empty database with a demo account and a handful of tasks,
 * so a fresh checkout has something to look at. Development only - it
 * inserts a user with a published password.
 */
import { runScript } from '../composition/scriptContext.js'
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher.js'
import type { TaskPriorityValue } from '../domain/value-objects/TaskPriority.js'
import type { TaskStatusValue } from '../domain/value-objects/TaskStatus.js'

const DEMO_EMAIL = 'demo@taskflow.com'
const DEMO_PASSWORD = 'demo123'

const DAY_MS = 24 * 60 * 60 * 1000

interface SeedTask {
  readonly title: string
  readonly description: string
  readonly status: TaskStatusValue
  readonly priority: TaskPriorityValue
  /** Offset from now, in days. Negative is overdue. */
  readonly dueInDays: number
}

// Typed against the value objects' unions rather than plain strings, so a
// status or priority that the domain would reject fails to compile instead
// of producing rows the app can't load.
const SEED_TASKS: readonly SeedTask[] = [
  {
    title: 'Set up development environment',
    description: 'Install Node.js, PostgreSQL, and Docker',
    status: 'completed',
    priority: 'high',
    dueInDays: -7,
  },
  {
    title: 'Learn Docker basics',
    description: 'Complete Docker tutorial and build first container',
    status: 'completed',
    priority: 'high',
    dueInDays: -5,
  },
  {
    title: 'Deploy to Oracle Cloud',
    description: 'Set up Oracle Cloud account and deploy first VM',
    status: 'in_progress',
    priority: 'high',
    dueInDays: 2,
  },
  {
    title: 'Configure CI/CD pipeline',
    description: 'Set up GitHub Actions for automated testing and deployment',
    status: 'in_progress',
    priority: 'medium',
    dueInDays: 5,
  },
  {
    title: 'Set up Kubernetes cluster',
    description: 'Install K3s on Oracle Cloud instances',
    status: 'todo',
    priority: 'high',
    dueInDays: 7,
  },
  {
    title: 'Configure monitoring with Prometheus',
    description: 'Deploy Prometheus and set up basic metrics collection',
    status: 'todo',
    priority: 'medium',
    dueInDays: 10,
  },
  {
    title: 'Create Grafana dashboards',
    description: 'Build dashboards for application and infrastructure monitoring',
    status: 'todo',
    priority: 'medium',
    dueInDays: 12,
  },
  {
    title: 'Write Ansible playbooks',
    description: 'Automate server configuration with Ansible',
    status: 'todo',
    priority: 'low',
    dueInDays: 14,
  },
  {
    title: 'Implement automated backups',
    description: 'Set up automated database backups',
    status: 'todo',
    priority: 'medium',
    dueInDays: 14,
  },
  {
    title: 'Security audit',
    description: 'Run security scans and fix vulnerabilities',
    status: 'todo',
    priority: 'high',
    dueInDays: 21,
  },
]

void runScript('Database seeding', async ({ db, logger }) => {
  logger.info('Starting database seeding...')

  const passwordHash = await new BcryptPasswordHasher().hash(DEMO_PASSWORD)

  const { rows } = await db.query<{ id: number }>(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
    ['Demo User', DEMO_EMAIL, passwordHash]
  )

  const userId = rows[0]?.id
  if (userId === undefined) {
    throw new Error('Insert of the demo user returned no id')
  }

  logger.info(`Created demo user with ID: ${userId}`)

  const now = Date.now()
  for (const task of SEED_TASKS) {
    await db.query(
      'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        userId,
        task.title,
        task.description,
        task.status,
        task.priority,
        new Date(now + task.dueInDays * DAY_MS),
      ]
    )
  }

  logger.info(`Created ${SEED_TASKS.length} sample tasks`)
  logger.info('Database seeding completed successfully!')
  logger.info('--- Demo Account Credentials ---')
  logger.info(`Email: ${DEMO_EMAIL}`)
  logger.info(`Password: ${DEMO_PASSWORD}`)
  logger.info('--------------------------------')
})
