import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { gameModelsRepository } from '@/data/repositories/gameModelsRepository'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { ArrowLeft, Save } from 'lucide-react'
import { useAlertDialog } from '@/contexts/AlertContext'

export function ModelCreatePage() {
  const navigate = useNavigate()
  const { showAlert } = useAlertDialog()
  const [name, setName] = useState('')
  const [minPlayers, setMinPlayers] = useState(2)
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [scoringMode, setScoringMode] = useState<'NORMAL' | 'INVERTED'>('NORMAL')
  const [scoreLimit, setScoreLimit] = useState<number | undefined>()
  const [turnLimit, setTurnLimit] = useState<number | undefined>()
  const [showTurns, setShowTurns] = useState(true)
  const [showIntermediate, setShowIntermediate] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await gameModelsRepository.create({
        name: name.trim(),
        minPlayers,
        maxPlayers,
        scoringMode,
        scoreLimit,
        turnLimit,
        showTurns,
        showIntermediate
      })

      navigate({ to: '/models' })
    } catch (error) {
      console.error('Error creating model:', error)
      showAlert({ title: 'Erreur', message: 'Erreur lors de la création du modèle', type: 'error' })
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
          onClick={() => navigate({ to: '/models' })}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Nouveau modèle</h1>
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
            autoFocus
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

        {/* Display options */}
        <div className="space-y-3">
          <Label>Options d'affichage</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Afficher les tours</p>
                <p className="text-sm text-muted-foreground">
                  Afficher le numéro de tour dans le tableau des scores
                </p>
              </div>
              <Switch
                checked={showTurns}
                onCheckedChange={setShowTurns}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Afficher les totaux intermédiaires</p>
                <p className="text-sm text-muted-foreground">
                  Afficher le total cumulé après chaque tour
                </p>
              </div>
              <Switch
                checked={showIntermediate}
                onCheckedChange={setShowIntermediate}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
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
            {isSubmitting ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
