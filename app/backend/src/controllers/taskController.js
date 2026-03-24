import { Task } from '../models/Task.js'
import { tasksByStatus } from '../utils/metrics.js'
import logger from '../utils/logger.js'

export const getTasks = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
    }

    const tasks = await Task.findByUserId(req.user.id, filters)

    res.json({
      tasks,
      count: tasks.length,
    })
  } catch (error) {
    next(error)
  }
}

export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUserId(req.params.id, req.user.id)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.json({ task })
  } catch (error) {
    next(error)
  }
}

export const createTask = async (req, res, next) => {
  try {
    const task = await Task.create(req.user.id, req.body)

    // Update metrics
    tasksByStatus.inc({ status: task.status })

    logger.info('Task created', { taskId: task.id, userId: req.user.id })

    res.status(201).json({
      message: 'Task created successfully',
      task,
    })
  } catch (error) {
    next(error)
  }
}

export const updateTask = async (req, res, next) => {
  try {
    // Get old task to update metrics
    const oldTask = await Task.findByIdAndUserId(req.params.id, req.user.id)
    if (!oldTask) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const task = await Task.update(req.params.id, req.user.id, req.body)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Update metrics if status changed
    if (oldTask.status !== task.status) {
      tasksByStatus.dec({ status: oldTask.status })
      tasksByStatus.inc({ status: task.status })
    }

    logger.info('Task updated', { taskId: task.id, userId: req.user.id })

    res.json({
      message: 'Task updated successfully',
      task,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUserId(req.params.id, req.user.id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    await Task.delete(req.params.id, req.user.id)

    // Update metrics
    tasksByStatus.dec({ status: task.status })

    logger.info('Task deleted', { taskId: req.params.id, userId: req.user.id })

    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const getStatistics = async (req, res, next) => {
  try {
    const stats = await Task.getStatistics(req.user.id)
    res.json(stats)
  } catch (error) {
    next(error)
  }
}
