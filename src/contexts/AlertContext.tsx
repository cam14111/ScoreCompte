import React, { createContext, useContext, useState, useCallback } from 'react'
import { AlertDialog } from '@/components/ui/AlertDialog'

interface AlertOptions {
  title?: string
  message: string
  type?: 'error' | 'success' | 'warning' | 'info'
  buttonText?: string
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => void
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    isOpen: boolean
    options?: AlertOptions
  }>({
    isOpen: false,
  })

  const showAlert = useCallback((options: AlertOptions) => {
    setState({
      isOpen: true,
      options,
    })
  }, [])

  const closeAlert = useCallback(() => {
    setState({ isOpen: false })
  }, [])

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertDialog
        open={state.isOpen}
        onOpenChange={closeAlert}
        title={state.options?.title}
        message={state.options?.message || ''}
        type={state.options?.type}
        buttonText={state.options?.buttonText}
      />
    </AlertContext.Provider>
  )
}

export function useAlertDialog() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlertDialog must be used within an AlertProvider')
  }
  return context
}
