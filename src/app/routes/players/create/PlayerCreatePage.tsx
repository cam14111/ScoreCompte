import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { playersRepository } from '@/data/repositories/playersRepository'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ColorPicker } from '@/components/players/ColorPicker'
import { AvatarPicker } from '@/components/players/AvatarPicker'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { ArrowLeft, Save } from 'lucide-react'
import { useAlertDialog } from '@/contexts/AlertContext'

export function PlayerCreatePage() {
  const navigate = useNavigate()
  const { showAlert } = useAlertDialog()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [avatarType, setAvatarType] = useState<'initial' | 'icon' | 'image'>('initial')
  const [avatarValue, setAvatarValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      const finalAvatarValue = avatarType === 'initial'
        ? name.charAt(0).toUpperCase()
        : avatarValue

      await playersRepository.create({
        name: name.trim(),
        color,
        avatarType,
        avatarValue: finalAvatarValue
      })

      navigate({ to: '/players' })
    } catch (error) {
      console.error('Error creating player:', error)
      showAlert({ title: 'Erreur', message: 'Erreur lors de la création du joueur', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/players' })}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Nouveau joueur</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview */}
        <div className="flex justify-center py-4">
          <PlayerAvatar
            type={avatarType}
            value={avatarType === 'initial' ? name.charAt(0).toUpperCase() : avatarValue}
            color={color}
            name={name || 'Joueur'}
            size="xl"
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du joueur"
            required
            autoFocus
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label>Couleur</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {/* Avatar */}
        <AvatarPicker
          type={avatarType}
          value={avatarValue}
          onTypeChange={setAvatarType}
          onValueChange={setAvatarValue}
          playerName={name}
        />

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/players' })}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
