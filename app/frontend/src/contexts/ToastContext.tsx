import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import ToastViewport from '../components/ToastViewport'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  variant: ToastVariant
  message: string
}

/* Errors linger longest: they usually carry a server message worth reading,
   and re-triggering the failed action to re-read it is a poor trade. */
const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 5000,
  error: 8000,
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * App-owned transient messages. Replaces the native dialogs the browser
 * renders in its own chrome, so success/failure feedback stays inside the
 * TaskFlow design language and never blocks the page.
 */
export const ToastProvider = ({ children }: PropsWithChildren): ReactElement => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const nextId = useRef(0)

  const dismissToast = useCallback((id: number): void => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info'): void => {
      const id = nextId.current
      nextId.current += 1
      setToasts(prev => [...prev, { id, variant, message }])
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), AUTO_DISMISS_MS[variant])
      )
    },
    [dismissToast]
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}
