import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { tasksAPI } from '../api/tasks'
import type { Task, TaskFilters, TaskInput, TaskStatus } from '../api/types'

function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message
    if (typeof message === 'string' && message.length > 0) return message
    return err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}

const emptyFilters: TaskFilters = { status: '', priority: '' }

/**
 * Task list data + mutations for the Tasks page. Keeps fetching, filters,
 * and error reporting out of the JSX so the page is mostly composition.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters)

  const refreshTasks = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await tasksAPI.getTasks(filters)
      setTasks(data.tasks)
      setError('')
    } catch (err) {
      setError('Failed to load tasks')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      try {
        const data = await tasksAPI.getTasks(filters)
        if (!cancelled) {
          setTasks(data.tasks)
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load tasks')
          console.error(err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTasks()

    return () => {
      cancelled = true
    }
  }, [filters])

  const saveTask = async (taskData: TaskInput, editingId: number | null): Promise<boolean> => {
    try {
      if (editingId !== null) {
        await tasksAPI.updateTask(editingId, taskData)
      } else {
        await tasksAPI.createTask(taskData)
      }
      setError('')
      await refreshTasks()
      return true
    } catch (err) {
      setError('Failed to save task: ' + apiErrorMessage(err, 'Unknown error'))
      console.error(err)
      return false
    }
  }

  const deleteTask = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await tasksAPI.deleteTask(id)
      setError('')
      await refreshTasks()
    } catch (err) {
      setError('Failed to delete task: ' + apiErrorMessage(err, 'Unknown error'))
      console.error(err)
    }
  }

  const changeStatus = async (id: number, status: TaskStatus): Promise<void> => {
    try {
      await tasksAPI.updateTask(id, { status })
      setError('')
      await refreshTasks()
    } catch (err) {
      setError('Failed to update task status: ' + apiErrorMessage(err, 'Unknown error'))
      console.error(err)
    }
  }

  const updateFilter = (filterType: keyof TaskFilters, value: string): void => {
    setLoading(true)
    setFilters(prev => ({
      ...prev,
      [filterType]: value as TaskFilters[typeof filterType],
    }))
  }

  const clearFilters = (): void => {
    setLoading(true)
    setFilters(emptyFilters)
  }

  return {
    tasks,
    loading,
    error,
    filters,
    updateFilter,
    clearFilters,
    saveTask,
    deleteTask,
    changeStatus,
  }
}
