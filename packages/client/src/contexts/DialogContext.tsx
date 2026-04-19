import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface DialogState {
  type: 'alert' | 'confirm'
  message: string
  resolve: (result: boolean) => void
}

interface DialogContextValue {
  showAlert: (message: string) => Promise<void>
  showConfirm: (message: string) => Promise<boolean>
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be inside DialogProvider')
  return ctx
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const resolveRef = useRef<((result: boolean) => void) | null>(null)

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = () => resolve()
      setDialog({ type: 'alert', message, resolve: () => resolve() })
    })
  }, [])

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({ type: 'confirm', message, resolve })
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(result)
      resolveRef.current = null
    }
    setDialog(null)
  }, [])

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => dialog.type === 'alert' && handleClose(false)} />
          <div className="relative w-full max-w-sm mx-4 theme-bg-secondary rounded-lg shadow-xl p-6">
            <p className="theme-text-primary text-sm whitespace-pre-line mb-6">{dialog.message}</p>
            <div className="flex justify-end gap-2">
              {dialog.type === 'confirm' && (
                <button
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 text-sm theme-bg-tertiary hover:opacity-80 theme-text-primary rounded"
                >
                  취소
                </button>
              )}
              <button
                onClick={() => handleClose(dialog.type === 'confirm' ? true : false)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded"
                autoFocus
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
