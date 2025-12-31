import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog'
import { Button } from './Button'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  type?: 'error' | 'success' | 'warning' | 'info'
  buttonText?: string
}

const iconMap = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  error: 'text-destructive',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

const bgMap = {
  error: 'bg-destructive/10',
  success: 'bg-green-500/10',
  warning: 'bg-yellow-500/10',
  info: 'bg-blue-500/10',
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  type = 'info',
  buttonText = 'OK',
}) => {
  const Icon = iconMap[type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgMap[type]}`}>
              <Icon className={`h-5 w-5 ${colorMap[type]}`} />
            </div>
            <DialogTitle className="text-left">{title || 'Information'}</DialogTitle>
          </div>
          <DialogDescription className="text-left whitespace-pre-line">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
