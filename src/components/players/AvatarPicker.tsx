import { useState } from 'react'
import { AVATAR_ICONS } from '@/lib/avatarIcons'
import { cn } from '@/lib/cn'
import * as Icons from 'lucide-react'
import { Label } from '@/components/ui/Label'

interface AvatarPickerProps {
  type: 'initial' | 'icon' | 'image'
  value: string
  onTypeChange: (type: 'initial' | 'icon' | 'image') => void
  onValueChange: (value: string) => void
  playerName: string
}

export function AvatarPicker({
  type,
  value,
  onTypeChange,
  onValueChange,
  playerName
}: AvatarPickerProps) {
  const [selectedTab, setSelectedTab] = useState<'initial' | 'icon'>(
    type === 'image' ? 'icon' : type
  )

  const handleTabChange = (newTab: 'initial' | 'icon') => {
    setSelectedTab(newTab)
    onTypeChange(newTab)
    if (newTab === 'initial') {
      onValueChange(playerName.charAt(0).toUpperCase())
    }
  }

  return (
    <div className="space-y-4">
      <Label>Avatar</Label>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors touch-manipulation',
            selectedTab === 'initial'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => handleTabChange('initial')}
        >
          Initiale
        </button>
        <button
          type="button"
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors touch-manipulation',
            selectedTab === 'icon'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => handleTabChange('icon')}
        >
          Icône
        </button>
      </div>

      {/* Content */}
      {selectedTab === 'initial' && (
        <div className="p-4 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {playerName.charAt(0).toUpperCase() || '?'}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            L'initiale sera générée automatiquement à partir du nom
          </p>
        </div>
      )}

      {selectedTab === 'icon' && (
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_ICONS.map((iconName) => {
            const IconComponent = Icons[iconName.split('-').map(
              (part, i) => i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) :
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join('') as keyof typeof Icons] as any

            if (!IconComponent) return null

            return (
              <button
                key={iconName}
                type="button"
                className={cn(
                  'h-12 w-12 rounded-lg border-2 flex items-center justify-center transition-all touch-manipulation',
                  value === iconName && type === 'icon'
                    ? 'border-primary bg-primary/10 scale-110'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => {
                  onTypeChange('icon')
                  onValueChange(iconName)
                }}
              >
                <IconComponent className="h-6 w-6" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
