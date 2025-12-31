import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { gameModelsRepository } from '@/data/repositories/gameModelsRepository'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import type { GameModel } from '@/data/db'

export function ModelEditPage() {
  const navigate = useNavigate()
  const { modelId } = useParams({ strict: false }) as { modelId: string }
  const [model, setModel] = useState<GameModel | null>(null)
  const [name, setName] = useState('')
  const [minPlayers, setMinPlayers] = useState(2)
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [scoringMode, setScoringMode] = useState<'NORMAL' | 'INVERTED'>('NORMAL')
  const [scoreLimit, setScoreLimit] = useState<number | undefined>()
  const [turnLimit, setTurnLimit] = useState<number | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [canDelete, setCanDelete] = useState(true)

  useEffect(() => {
    const loadModel = async () => {
      const m = await gameModelsRepository.getById(modelId)
      if (!m) {
        navigate({ to: '/models' })
        return
      }
      setModel(m)
      setName(m.name)
      setMinPlayers(m.minPlayers)
      setMaxPlayers(m.maxPlayers)
      setScoringMode(m.scoringMode)
      setScoreLimit(m.scoreLimit)
      setTurnLimit(m.turnLimit)

      const deletable = await gameModelsRepository.canDelete(modelId)
      setCanDelete(deletable)
    }

    if (modelId) {
      loadModel()
    }
  }, [modelId, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !modelId) return

    setIsSubmitting(true)
    try {
      await gameModelsRepository.update(modelId, {
        name: name.trim(),
        minPlayers,
        maxPlayers,
        scoringMode,
        scoreLimit,
        turnLimit
      })

      navigate({ to: '/models' })
    } catch (error) {
      console.error('Error updating model:', error)
      alert('Erreur lors de la mise à jour du modèle')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!modelId) return

    try {
      await gameModelsRepository.softDelete(modelId)
      navigate({ to: '/models' })
    } catch (error) {
      console.error('Error deleting model:', error)
      alert('Erreur lors de la suppression du modèle')
    }
  }

  if (!model) {
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
          onClick={() => navigate({ to: '/models' })}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Modifier modèle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nom du jeu *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Papayoo, Flip 7, ..."
            required
          />
        </div>

        {/* Player count */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPlayers">Joueurs min</Label>
            <Input
              id="minPlayers"
              type="number"
              min={1}
              max={20}
              value={minPlayers}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1
                setMinPlayers(val)
                if (val > maxPlayers) setMaxPlayers(val)
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Joueurs max</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={minPlayers}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value) || minPlayers)}
              required
            />
          </div>
        </div>

        {/* Scoring mode */}
        <div className="space-y-3">
          <Label>Mode de scoring</Label>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Score inversé</p>
              <p className="text-sm text-muted-foreground">
                {scoringMode === 'INVERTED'
                  ? 'Le plus petit score gagne'
                  : 'Le plus grand score gagne'}
              </p>
            </div>
            <Switch
              checked={scoringMode === 'INVERTED'}
              onCheckedChange={(checked) =>
                setScoringMode(checked ? 'INVERTED' : 'NORMAL')
              }
            />
          </div>
        </div>

        {/* End conditions */}
        <div className="space-y-3">
          <Label>Conditions de fin de partie (optionnel)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scoreLimit">Score max</Label>
              <Input
                id="scoreLimit"
                type="number"
                min={1}
                placeholder="Aucune limite"
                value={scoreLimit || ''}
                onChange={(e) => setScoreLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="turnLimit">Tours max</Label>
              <Input
                id="turnLimit"
                type="number"
                min={1}
                placeholder="Aucune limite"
                value={turnLimit || ''}
                onChange={(e) => setTurnLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ces limites seront utilisées par défaut lors de la création d'une partie avec ce modèle
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            disabled={!canDelete}
            title={!canDelete ? 'Impossible de supprimer un modèle utilisé dans une partie en cours' : ''}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/models' })}
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
            <DialogTitle>Supprimer le modèle ?</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {model.name} ? Cette action est irréversible.
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
