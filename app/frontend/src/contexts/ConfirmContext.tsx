import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = (): ConfirmContextValue => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

/**
 * Promise-based replacement for `window.confirm`. Keeping the same
 * `if (!(await confirm(...))) return` shape at call sites means swapping the
 * browser's dialog for our own costs one `await` and nothing else.
 */
export const ConfirmProvider = ({ children }: PropsWithChildren): ReactElement => {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>(resolve => {
        setPending(previous => {
          // A second prompt while one is open would strand the first promise.
          previous?.resolve(false)
          return { options, resolve }
        })
      }),
    []
  )

  const settle = (confirmed: boolean): void => {
    pending?.resolve(confirmed)
    setPending(null)
  }

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog
          options={pending.options}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}
