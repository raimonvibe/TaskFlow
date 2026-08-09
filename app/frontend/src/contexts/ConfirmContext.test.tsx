import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react'
import { ConfirmProvider, useConfirm, type ConfirmOptions } from './ConfirmContext'

const deleteOptions: ConfirmOptions = {
  title: 'Delete this task?',
  message: 'The task will be permanently removed. This cannot be undone.',
  confirmLabel: 'Delete task',
  destructive: true,
}

const Trigger = ({
  onResult,
  options = deleteOptions,
}: {
  onResult: (confirmed: boolean) => void
  options?: ConfirmOptions
}) => {
  const { confirm } = useConfirm()
  return (
    <button type="button" onClick={() => void confirm(options).then(onResult)}>
      ask
    </button>
  )
}

function renderTrigger(onResult: (confirmed: boolean) => void, options?: ConfirmOptions) {
  return render(
    <ConfirmProvider>
      <Trigger onResult={onResult} options={options} />
    </ConfirmProvider>
  )
}

const ask = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'ask' }))
}

describe('ConfirmContext', () => {
  it('shows no dialog until something asks for one', () => {
    renderTrigger(vi.fn())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('resolves true when the action is confirmed', async () => {
    const onResult = vi.fn()
    renderTrigger(onResult)

    ask()
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete this task?')

    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('resolves false when cancelled', async () => {
    const onResult = vi.fn()
    renderTrigger(onResult)

    ask()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancels on Escape', async () => {
    const onResult = vi.fn()
    renderTrigger(onResult)

    ask()
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
  })

  it('cancels on a backdrop click but not on a click inside the dialog', async () => {
    const onResult = vi.fn()
    renderTrigger(onResult)

    ask()
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onResult).not.toHaveBeenCalled()

    fireEvent.click(dialog.parentElement as HTMLElement)
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
  })

  it('opens a destructive prompt with Cancel focused', () => {
    renderTrigger(vi.fn())

    ask()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('opens a non-destructive prompt on its default labels with Confirm focused', () => {
    renderTrigger(vi.fn(), { title: 'Publish?', message: 'This makes the board public.' })

    ask()
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('settles a superseded prompt as cancelled rather than stranding it', async () => {
    const onResult = vi.fn()
    renderTrigger(onResult)

    ask()
    ask()

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1))
    expect(onResult).toHaveBeenCalledWith(false)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useConfirm())).toThrow(
      'useConfirm must be used within a ConfirmProvider'
    )
  })
})
