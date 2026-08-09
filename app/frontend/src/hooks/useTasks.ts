import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { tasksAPI } from '../api/tasks'
import { useConfirm } from '../contexts/ConfirmContext'
import { useToast } from '../contexts/ToastContext'
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
 *
 * `error` covers only the page-level case of the list failing to load, which
 * leaves nothing to render. Mutation outcomes go to toasts instead: the list
 * is still on screen, so a transient message beats a banner that shifts it.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters)
  const { showToast } = useToast()
  const { confirm } = useConfirm()

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
        showToast('Task updated.', 'success')
      } else {
        await tasksAPI.createTask(taskData)
        showToast('Task created.', 'success')
      }
      await refreshTasks()
      return true
    } catch (err) {
      showToast('Failed to save task: ' + apiErrorMessage(err, 'Unknown error'), 'error')
      console.error(err)
      return false
    }
  }

  const deleteTask = async (id: number): Promise<void> => {
    const confirmed = await confirm({
      title: 'Delete this task?',
      message: 'The task will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete task',
      destructive: true,
    })
    if (!confirmed) return

    try {
      await tasksAPI.deleteTask(id)
      showToast('Task deleted.', 'success')
      await refreshTasks()
    } catch (err) {
      showToast('Failed to delete task: ' + apiErrorMessage(err, 'Unknown error'), 'error')
      console.error(err)
    }
  }

  const changeStatus = async (id: number, status: TaskStatus): Promise<void> => {
    try {
      await tasksAPI.updateTask(id, { status })
      showToast('Task status updated.', 'success')
      await refreshTasks()
    } catch (err) {
      showToast('Failed to update task status: ' + apiErrorMessage(err, 'Unknown error'), 'error')
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
