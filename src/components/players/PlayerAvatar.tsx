import { cn } from '@/lib/cn'
import { getContrastColor } from '@/lib/colors'
import * as Icons from 'lucide-react'

interface PlayerAvatarProps {
  type: 'initial' | 'icon' | 'image'
  value: string
  color: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-2xl',
}

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

export function PlayerAvatar({
  type,
  value,
  color,
  name,
  size = 'md',
  className
}: PlayerAvatarProps) {
  const textColor = getContrastColor(color)

  if (type === 'initial') {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold',
          sizeClasses[size],
          className
        )}
        style={{ backgroundColor: color, color: textColor }}
      >
        {value || name.charAt(0).toUpperCase()}
      </div>
    )
  }

  if (type === 'icon') {
    const IconComponent = Icons[
      value.split('-').map(
        (part) => part.charAt(0).toUpperCase() + part.slice(1)
      ).join('') as keyof typeof Icons
    ] as any

    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center',
          sizeClasses[size],
          className
        )}
        style={{ backgroundColor: color, color: textColor }}
      >
        {IconComponent ? <IconComponent className={iconSizeClasses[size]} /> : null}
      </div>
    )
  }

  // type === 'image'
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden border-2',
        sizeClasses[size],
        className
      )}
      style={{ borderColor: color }}
    >
      <img src={value} alt={name} className="h-full w-full object-cover" />
    </div>
  )
}
