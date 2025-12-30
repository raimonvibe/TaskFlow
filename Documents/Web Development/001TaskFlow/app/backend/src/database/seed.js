import { query } from '../config/database.js'
import bcrypt from 'bcryptjs'
import logger from '../utils/logger.js'

const seed = async () => {
  try {
    logger.info('Starting database seeding...')

    // Create demo user
    // Use environment variable for demo password (fallback only for seeding)
    const demoPassword = process.env.DEMO_PASSWORD || 'ChangeMe123!'
    const hashedPassword = await bcrypt.hash(demoPassword, 10)
    const userResult = await query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      ['Demo User', 'demo@taskflow.com', hashedPassword]
    )
    const userId = userResult.rows[0].id
    logger.info(`Created demo user with ID: ${userId}`)

    // Create sample tasks
    const tasks = [
      {
        title: 'Set up development environment',
        description: 'Install Node.js, PostgreSQL, and Docker',
        status: 'completed',
        priority: 'high',
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        title: 'Learn Docker basics',
        description: 'Complete Docker tutorial and build first container',
        status: 'completed',
        priority: 'high',
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Deploy to Oracle Cloud',
        description: 'Set up Oracle Cloud account and deploy first VM',
        status: 'in_progress',
        priority: 'high',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      },
      {
        title: 'Configure CI/CD pipeline',
        description: 'Set up GitHub Actions for automated testing and deployment',
        status: 'in_progress',
        priority: 'medium',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Set up Kubernetes cluster',
        description: 'Install K3s on Oracle Cloud instances',
        status: 'todo',
        priority: 'high',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Configure monitoring with Prometheus',
        description: 'Deploy Prometheus and set up basic metrics collection',
        status: 'todo',
        priority: 'medium',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Create Grafana dashboards',
        description: 'Build dashboards for application and infrastructure monitoring',
        status: 'todo',
        priority: 'medium',
        due_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Write Ansible playbooks',
        description: 'Automate server configuration with Ansible',
        status: 'todo',
        priority: 'low',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Implement automated backups',
        description: 'Set up automated database backups',
        status: 'todo',
        priority: 'medium',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Security audit',
        description: 'Run security scans and fix vulnerabilities',
        status: 'todo',
        priority: 'high',
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
    ]

    for (const task of tasks) {
      await query(
        'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, task.title, task.description, task.status, task.priority, task.due_date]
      )
    }

    logger.info(`Created ${tasks.length} sample tasks`)
    logger.info('Database seeding completed successfully!')
    logger.info('Demo user email: demo@taskflow.com')
    logger.info('IMPORTANT: Change demo user password after first login')

    process.exit(0)
  } catch (error) {
    logger.error('Error seeding database:', error)
    process.exit(1)
  }
}

seed()
