import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act, screen, fireEvent } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { PropsWithChildren, ReactElement } from 'react'
import { useTasks } from './useTasks'
import { tasksAPI } from '../api/tasks'
import { ToastProvider } from '../contexts/ToastContext'
import { ConfirmProvider } from '../contexts/ConfirmContext'
import type { Task, TaskInput } from '../api/types'

vi.mock('../api/tasks')

const wrapper = ({ children }: PropsWithChildren): ReactElement => (
  <ToastProvider>
    <ConfirmProvider>{children}</ConfirmProvider>
  </ToastProvider>
)

const sampleTask: Task = {
  id: 1,
  user_id: 1,
  title: 'Write tests',
  description: null,
  status: 'todo',
  priority: 'medium',
  due_date: null,
  created_at: null,
  updated_at: null,
}

const sampleInput: TaskInput = {
  title: 'Write tests',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
}

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tasksAPI.getTasks).mockResolvedValue({ tasks: [sampleTask], count: 1 })
  })

  it('loads tasks on mount', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.tasks).toEqual([sampleTask])
    expect(result.current.error).toBe('')
    expect(tasksAPI.getTasks).toHaveBeenCalled()
  })

  it('surfaces a load error when the list request fails', async () => {
    vi.mocked(tasksAPI.getTasks).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useTasks(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load tasks')
    expect(result.current.tasks).toEqual([])
  })

  it('creates a task then refreshes the list', async () => {
    vi.mocked(tasksAPI.createTask).mockResolvedValue({ task: sampleTask })

    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saved = false
    await act(async () => {
      saved = await result.current.saveTask(sampleInput, null)
    })

    expect(saved).toBe(true)
    expect(tasksAPI.createTask).toHaveBeenCalledWith(sampleInput)
    expect(tasksAPI.getTasks).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Task created.')).toBeInTheDocument()
  })

  it('updates an existing task when an editing id is provided', async () => {
    vi.mocked(tasksAPI.updateTask).mockResolvedValue({ task: sampleTask })

    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.saveTask(sampleInput, 1)
    })

    expect(tasksAPI.updateTask).toHaveBeenCalledWith(1, sampleInput)
    expect(tasksAPI.createTask).not.toHaveBeenCalled()
    expect(screen.getByText('Task updated.')).toBeInTheDocument()
  })

  it('reports axios message text in a toast when save fails', async () => {
    const err = new AxiosError('Request failed')
    err.response = {
      data: { message: 'Title is required' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} as never },
    }
    vi.mocked(tasksAPI.createTask).mockRejectedValue(err)

    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saved = true
    await act(async () => {
      saved = await result.current.saveTask(sampleInput, null)
    })

    expect(saved).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to save task: Title is required')
    // The list itself loaded fine, so the page-level error slot stays empty.
    expect(result.current.error).toBe('')
  })

  it('deletes a task only once the in-app dialog is confirmed', async () => {
    vi.mocked(tasksAPI.deleteTask).mockResolvedValue({ message: 'Task deleted' })

    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let cancelled: Promise<void> | undefined
    act(() => {
      cancelled = result.current.deleteTask(1)
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await act(async () => {
      await cancelled
    })
    expect(tasksAPI.deleteTask).not.toHaveBeenCalled()

    let accepted: Promise<void> | undefined
    act(() => {
      accepted = result.current.deleteTask(1)
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Delete task' }))
    await act(async () => {
      await accepted
    })
    expect(tasksAPI.deleteTask).toHaveBeenCalledWith(1)
    expect(screen.getByText('Task deleted.')).toBeInTheDocument()
  })

  it('never falls back to the browser confirm dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(tasksAPI.deleteTask).mockResolvedValue({ message: 'Task deleted' })

    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.deleteTask(1)
    })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(confirmSpy).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('changes status then refreshes', async () => {
    vi.mocked(tasksAPI.updateTask).mockResolvedValue({ task: sampleTask })

    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.changeStatus(1, 'completed')
    })

    expect(tasksAPI.updateTask).toHaveBeenCalledWith(1, { status: 'completed' })
    expect(screen.getByText('Task status updated.')).toBeInTheDocument()
  })

  it('updates and clears filters', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      result.current.updateFilter('status', 'completed')
    })

    await waitFor(() => {
      expect(result.current.filters.status).toBe('completed')
    })

    await act(async () => {
      result.current.clearFilters()
    })

    await waitFor(() => {
      expect(result.current.filters).toEqual({ status: '', priority: '' })
    })
  })
})
