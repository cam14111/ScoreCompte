import { useState, useRef } from 'react'
import { AVATAR_ICONS } from '@/lib/avatarIcons'
import { cn } from '@/lib/cn'
import * as Icons from 'lucide-react'
import { Label } from '@/components/ui/Label'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
  const [selectedTab, setSelectedTab] = useState<'initial' | 'icon' | 'image'>(type)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTabChange = (newTab: 'initial' | 'icon' | 'image') => {
    setSelectedTab(newTab)
    onTypeChange(newTab)
    if (newTab === 'initial') {
      onValueChange(playerName.charAt(0).toUpperCase())
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert('L\'image est trop grande. Maximum 500 KB.')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image.')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      onTypeChange('image')
      onValueChange(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    onValueChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
        <button
          type="button"
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors touch-manipulation',
            selectedTab === 'image'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => handleTabChange('image')}
        >
          Image
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

      {selectedTab === 'image' && (
        <div className="space-y-4">
          {type === 'image' && value ? (
            <div className="relative inline-block">
              <img
                src={value}
                alt="Avatar"
                className="h-32 w-32 rounded-full object-cover border-2 border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-border rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Télécharger une image</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG jusqu'à 500 KB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Choisir une image
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
