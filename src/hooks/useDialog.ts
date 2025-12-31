import { useState, useCallback } from 'react'

interface DialogState {
  isOpen: boolean
  title?: string
  message?: string
  onConfirm?: () => void | Promise<void>
}

export function useDialog() {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
  })

  const openDialog = useCallback((options: Omit<DialogState, 'isOpen'>) => {
    setState({
      isOpen: true,
      ...options,
    })
  }, [])

  const closeDialog = useCallback(() => {
    setState({ isOpen: false })
  }, [])

  const handleConfirm = useCallback(async () => {
    if (state.onConfirm) {
      await state.onConfirm()
    }
    closeDialog()
  }, [state.onConfirm, closeDialog])

  return {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    openDialog,
    closeDialog,
    handleConfirm,
  }
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean
    options?: ConfirmOptions
    resolver?: (value: boolean) => void
  }>({
    isOpen: false,
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolver: resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolver?.(true)
    setState({ isOpen: false })
  }, [state.resolver])

  const handleCancel = useCallback(() => {
    state.resolver?.(false)
    setState({ isOpen: false })
  }, [state.resolver])

  return {
    isOpen: state.isOpen,
    options: state.options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}

interface AlertOptions {
  title?: string
  message: string
  type?: 'error' | 'success' | 'warning' | 'info'
}

export function useAlert() {
  const [state, setState] = useState<{
    isOpen: boolean
    options?: AlertOptions
  }>({
    isOpen: false,
  })

  const alert = useCallback((options: AlertOptions) => {
    setState({
      isOpen: true,
      options,
    })
  }, [])

  const closeAlert = useCallback(() => {
    setState({ isOpen: false })
  }, [])

  return {
    isOpen: state.isOpen,
    options: state.options,
    alert,
    closeAlert,
  }
}
