import { query } from '../config/database.js'

export const Task = {
  // Create a new task
  create: async (userId, taskData) => {
    const { title, description, status, priority, due_date } = taskData
    const result = await query(
      'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, title, description || null, status || 'todo', priority || 'medium', due_date || null]
    )
    return result.rows[0]
  },

  // Find all tasks for a user
  findByUserId: async (userId, filters = {}) => {
    let queryText = 'SELECT * FROM tasks WHERE user_id = $1'
    const params = [userId]
    let paramCount = 2

    if (filters.status) {
      queryText += ` AND status = $${paramCount}`
      params.push(filters.status)
      paramCount++
    }

    if (filters.priority) {
      queryText += ` AND priority = $${paramCount}`
      params.push(filters.priority)
      paramCount++
    }

    queryText += ' ORDER BY created_at DESC'

    const result = await query(queryText, params)
    return result.rows
  },

  // Find a task by ID and user ID
  findByIdAndUserId: async (id, userId) => {
    const result = await query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
    return result.rows[0]
  },

  // Update a task
  update: async (id, userId, updates) => {
    const allowedFields = ['title', 'description', 'status', 'priority', 'due_date']
    const fields = []
    const values = []
    let paramCount = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    if (fields.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(id, userId)
    const result = await query(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
      values
    )
    return result.rows[0]
  },

  // Delete a task
  delete: async (id, userId) => {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    )
    return result.rows[0]
  },

  // Get task statistics for a user
  getStatistics: async userId => {
    const result = await query(
      `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'todo') as todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority
      FROM tasks
      WHERE user_id = $1
    `,
      [userId]
    )

    const stats = result.rows[0]
    return {
      total: parseInt(stats.total),
      byStatus: {
        todo: parseInt(stats.todo),
        in_progress: parseInt(stats.in_progress),
        completed: parseInt(stats.completed),
      },
      byPriority: {
        low: parseInt(stats.low_priority),
        medium: parseInt(stats.medium_priority),
        high: parseInt(stats.high_priority),
      },
    }
  },
}
