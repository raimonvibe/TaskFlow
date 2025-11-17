import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TaskCard from './TaskCard'

describe('TaskCard', () => {
  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'high',
    due_date: '2025-12-31',
  }

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
  }

  it('should render task information', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />)

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />)

    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockTask)
  })

  it('should call onDelete when delete button is clicked', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />)

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    expect(mockHandlers.onDelete).toHaveBeenCalledWith(1)
  })

  it('should call onStatusChange when status is changed', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />)

    const statusSelect = screen.getByRole('combobox')
    fireEvent.change(statusSelect, { target: { value: 'completed' } })

    expect(mockHandlers.onStatusChange).toHaveBeenCalledWith(1, 'completed')
  })

  it('should display "No due date" when no due date is provided', () => {
    const taskWithoutDueDate = { ...mockTask, due_date: null }
    render(<TaskCard task={taskWithoutDueDate} {...mockHandlers} />)

    expect(screen.getByText('No due date')).toBeInTheDocument()
  })

  it('should not render description if not provided', () => {
    const taskWithoutDescription = { ...mockTask, description: null }
    render(<TaskCard task={taskWithoutDescription} {...mockHandlers} />)

    expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
  })

  it('should apply correct priority color classes', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />)

    const priorityBadge = screen.getByText('high')
    expect(priorityBadge.className).toContain('bg-red-100')
    expect(priorityBadge.className).toContain('text-red-800')
  })

  it('should format due date correctly', () => {
    render(<TaskCard task={mockTask} {...mockHandlers} />)

    // The date should be formatted as "Dec 31, 2025" or similar
    expect(screen.getByText(/Dec 31, 2025/i)).toBeInTheDocument()
  })
})
