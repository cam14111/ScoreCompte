import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { playersRepository } from '@/data/repositories/playersRepository'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ColorPicker } from '@/components/players/ColorPicker'
import { AvatarPicker } from '@/components/players/AvatarPicker'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import type { Player } from '@/data/db'

export function PlayerEditPage() {
  const navigate = useNavigate()
  const { playerId } = useParams({ strict: false }) as { playerId: string }
  const [player, setPlayer] = useState<Player | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [avatarType, setAvatarType] = useState<'initial' | 'icon' | 'image'>('initial')
  const [avatarValue, setAvatarValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const loadPlayer = async () => {
      const p = await playersRepository.getById(playerId)
      if (!p) {
        navigate({ to: '/players' })
        return
      }
      setPlayer(p)
      setName(p.name)
      setColor(p.color)
      setAvatarType(p.avatarType)
      setAvatarValue(p.avatarValue)
    }

    if (playerId) {
      loadPlayer()
    }
  }, [playerId, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !playerId) return

    setIsSubmitting(true)
    try {
      const finalAvatarValue = avatarType === 'initial'
        ? name.charAt(0).toUpperCase()
        : avatarValue

      await playersRepository.update(playerId, {
        name: name.trim(),
        color,
        avatarType,
        avatarValue: finalAvatarValue
      })

      navigate({ to: '/players' })
    } catch (error) {
      console.error('Error updating player:', error)
      alert('Erreur lors de la mise à jour du joueur')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!playerId) return

    try {
      await playersRepository.softDelete(playerId)
      navigate({ to: '/players' })
    } catch (error) {
      console.error('Error deleting player:', error)
      alert('Erreur lors de la suppression du joueur')
    }
  }

  if (!player) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
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
        <h1 className="text-2xl font-bold">Modifier joueur</h1>
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

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le joueur ?</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {player.name} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
