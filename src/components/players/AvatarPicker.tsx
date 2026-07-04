import { useState, useRef } from 'react'
import { AVATAR_ICONS, getAvatarIcon } from '@/lib/avatarIcons'
import { cn } from '@/lib/cn'
import { Label } from '@/components/ui/Label'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAlertDialog } from '@/contexts/AlertContext'

// Redimensionne l'image en 256×256 max : réduit fortement la taille stockée
// en base (et donc celle des exports/backups Google Drive)
const AVATAR_MAX_DIMENSION = 256
const AVATAR_MAX_INPUT_SIZE = 8 * 1024 * 1024 // 8 Mo avant compression

async function resizeImageToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image invalide'))
    image.src = dataUrl
  })

  const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return dataUrl
  context.drawImage(img, 0, 0, width, height)
  // PNG conserve la transparence ; JPEG (plus compact) pour le reste
  return file.type === 'image/png'
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.85)
}

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
  const { showAlert } = useAlertDialog()

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

    if (!file.type.startsWith('image/')) {
      showAlert({ title: 'Fichier invalide', message: 'Veuillez sélectionner une image.', type: 'error' })
      return
    }

    if (file.size > AVATAR_MAX_INPUT_SIZE) {
      showAlert({ title: 'Image trop grande', message: 'L\'image dépasse 8 Mo. Choisissez une image plus légère.', type: 'error' })
      return
    }

    try {
      const resized = await resizeImageToDataUrl(file)
      onTypeChange('image')
      onValueChange(resized)
    } catch {
      showAlert({ title: 'Erreur', message: 'Impossible de lire cette image.', type: 'error' })
    }
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
            const IconComponent = getAvatarIcon(iconName)
            if (!IconComponent) return null

            return (
              <button
                key={iconName}
                type="button"
                aria-label={`Icône ${iconName}`}
                aria-pressed={value === iconName && type === 'icon'}
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
                aria-label="Supprimer l'image"
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
                  PNG, JPG… (redimensionnée automatiquement)
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
