import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react'
import { ToastProvider, useToast, type ToastVariant } from './ToastContext'

const Trigger = ({ message, variant }: { message: string; variant?: ToastVariant }) => {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast(message, variant)}>
      fire
    </button>
  )
}

function renderTrigger(message: string, variant?: ToastVariant) {
  return render(
    <ToastProvider>
      <Trigger message={message} variant={variant} />
    </ToastProvider>
  )
}

const fire = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'fire' }))
}

describe('ToastContext', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the live region mounted before any message exists', () => {
    const { container } = renderTrigger('unused')

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull()
    expect(screen.queryByText('unused')).not.toBeInTheDocument()
  })

  it('shows a message and removes it when dismissed', () => {
    renderTrigger('Task created.', 'success')

    fire()
    expect(screen.getByText('Task created.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    expect(screen.queryByText('Task created.')).not.toBeInTheDocument()
  })

  it('auto-dismisses a success message after its timeout', () => {
    vi.useFakeTimers()
    renderTrigger('Task deleted.', 'success')

    fire()
    expect(screen.getByText('Task deleted.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3999)
    })
    expect(screen.getByText('Task deleted.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('Task deleted.')).not.toBeInTheDocument()
  })

  it('leaves an error message up longer than a success message', () => {
    vi.useFakeTimers()
    renderTrigger('Failed to save task: Title is required', 'error')

    fire()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to save task: Title is required')

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('announces errors assertively and everything else politely', () => {
    const { unmount } = renderTrigger('Boom', 'error')
    fire()
    expect(screen.getByRole('alert')).toHaveTextContent('Boom')
    unmount()

    renderTrigger('Heads up')
    fire()
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stacks messages when several actions report at once', () => {
    renderTrigger('Task status updated.', 'success')

    fire()
    fire()

    expect(screen.getAllByText('Task status updated.')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Dismiss message' })).toHaveLength(2)
  })

  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a ToastProvider'
    )
  })
})
