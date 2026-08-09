import { useEffect, useRef, type ReactElement } from 'react'
import type { ConfirmOptions } from '../contexts/ConfirmContext'

export interface ConfirmDialogProps {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({ options, onConfirm, onCancel }: ConfirmDialogProps): ReactElement => {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options

  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Destructive prompts open with Cancel focused, so a reflexive Enter after
  // clicking Delete backs out instead of confirming the deletion.
  useEffect(() => {
    const initial = destructive ? cancelRef.current : confirmRef.current
    initial?.focus()
  }, [destructive])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={event => event.stopPropagation()}
        className="w-full max-w-md rounded-md border border-primary-100 bg-white dark:border-primary-600 dark:bg-primary-800"
      >
        <div className="border-b border-primary-100 p-6 dark:border-primary-600">
          <h2 id="confirm-dialog-title" className="font-serif text-xl font-semibold text-ink">
            {title}
          </h2>
        </div>

        <p
          id="confirm-dialog-message"
          className="px-6 py-5 text-sm text-primary-600 dark:text-primary-200"
        >
          {message}
        </p>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn btn-secondary">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
