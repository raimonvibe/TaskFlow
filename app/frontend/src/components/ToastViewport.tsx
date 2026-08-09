import { Info, SealCheck, WarningCircle, X } from '@phosphor-icons/react'
import type { ReactElement } from 'react'
import type { Toast, ToastVariant } from '../contexts/ToastContext'

const variantStyles: Record<ToastVariant, string> = {
  success:
    'bg-accent-50 border-accent-300 text-accent-700 dark:bg-primary-800 dark:border-accent-400 dark:text-accent-200',
  error:
    'bg-red-50 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300',
  info: 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-800 dark:border-primary-600 dark:text-primary-100',
}

function variantIcon(variant: ToastVariant): ReactElement {
  if (variant === 'success') return <SealCheck size={20} weight="duotone" />
  if (variant === 'error') return <WarningCircle size={20} weight="duotone" />
  return <Info size={20} weight="duotone" />
}

export interface ToastViewportProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

/**
 * The live region stays mounted even when empty - screen readers announce
 * additions to an existing region far more reliably than a region that
 * appears at the same moment as its first message.
 */
const ToastViewport = ({ toasts, onDismiss }: ToastViewportProps): ReactElement => {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex flex-col items-center gap-3 p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:p-0"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          {...(toast.variant === 'error' ? { role: 'alert' } : {})}
          className={`pointer-events-auto flex w-full items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-sm sm:w-96 ${variantStyles[toast.variant]}`}
        >
          <span className="mt-0.5 shrink-0">{variantIcon(toast.variant)}</span>
          <p className="flex-1 break-words">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss message"
            className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastViewport
