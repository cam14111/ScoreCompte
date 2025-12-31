import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { gameModelsRepository } from '@/data/repositories/gameModelsRepository'
import { playersRepository } from '@/data/repositories/playersRepository'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { ArrowLeft, Plus, X } from 'lucide-react'
import type { GameModel } from '@/data/db'

export function GameCreatePage() {
  const navigate = useNavigate()
  const models = useLiveQuery(() => gameModelsRepository.getAll(), [])
  const players = useLiveQuery(() => playersRepository.getAll(), [])

  const [selectedModel, setSelectedModel] = useState<GameModel | null>(null)
  const [title, setTitle] = useState('')
  const [gameName, setGameName] = useState('')
  const [scoreLimit, setScoreLimit] = useState<number | undefined>()
  const [turnLimit, setTurnLimit] = useState<number | undefined>()
  const [scoringMode, setScoringMode] = useState<'NORMAL' | 'INVERTED'>('NORMAL')
  const [showTurns, setShowTurns] = useState(true)
  const [showIntermediate, setShowIntermediate] = useState(true)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Générer le titre automatiquement
    const now = new Date()
    const dateTimeStr = format(now, 'EEEE d MMMM yyyy HH:mm', { locale: fr })
    const capitalizedDateTime = dateTimeStr.charAt(0).toUpperCase() + dateTimeStr.slice(1)

    if (selectedModel) {
      setGameName(selectedModel.name)
      setScoringMode(selectedModel.scoringMode)
      setScoreLimit(selectedModel.scoreLimit)
      setTurnLimit(selectedModel.turnLimit)
      setTitle(`${selectedModel.name} ${capitalizedDateTime}`)
    } else {
      setTitle(`Partie ${capitalizedDateTime}`)
    }
  }, [selectedModel])

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        // Désélection toujours possible
        return prev.filter(id => id !== playerId)
      } else {
        // Vérifier le nombre max de joueurs du modèle
        const maxAllowed = selectedModel?.maxPlayers
        if (maxAllowed && prev.length >= maxAllowed) {
          return prev // Ne pas ajouter si on a atteint la limite
        }
        return [...prev, playerId]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation du nombre de joueurs
    const minRequired = selectedModel?.minPlayers || 2
    const maxAllowed = selectedModel?.maxPlayers

    if (!gameName.trim() || selectedPlayerIds.length < minRequired) return
    if (maxAllowed && selectedPlayerIds.length > maxAllowed) return

    setIsSubmitting(true)
    try {
      const game = await gamesRepository.create({
        modelId: selectedModel?.id,
        title: title.trim() || undefined,
        gameName: gameName.trim(),
        scoreLimit,
        turnLimit,
        scoringMode,
        showTurns,
        showIntermediate,
        playerIds: selectedPlayerIds
      })

      navigate({ to: '/games/$gameId', params: { gameId: game.id } })
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Erreur lors de la création de la partie')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!models || !players) {
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
          onClick={() => navigate({ to: '/games' })}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Nouvelle partie</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model selection */}
        {models.length > 0 && (
          <div className="space-y-2">
            <Label>Modèle de jeu (optionnel)</Label>
            <div className="grid gap-2">
              <Button
                type="button"
                variant={!selectedModel ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setSelectedModel(null)}
              >
                Partie personnalisée
              </Button>
              {models.map(model => (
                <Button
                  key={model.id}
                  type="button"
                  variant={selectedModel?.id === model.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setSelectedModel(model)}
                >
                  {model.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Title (optional) */}
        <div className="space-y-2">
          <Label htmlFor="title">Titre (optionnel)</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Soirée du 25 décembre"
          />
        </div>

        {/* Game name */}
        <div className="space-y-2">
          <Label htmlFor="gameName">Nom du jeu *</Label>
          <Input
            id="gameName"
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Ex: Papayoo"
            required
          />
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scoreLimit">Score max (opt.)</Label>
            <Input
              id="scoreLimit"
              type="number"
              value={scoreLimit || ''}
              onChange={(e) => setScoreLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Illimité"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="turnLimit">Nb tours (opt.)</Label>
            <Input
              id="turnLimit"
              type="number"
              value={turnLimit || ''}
              onChange={(e) => setTurnLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Illimité"
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label>Marquage inversé</Label>
            <Switch
              checked={scoringMode === 'INVERTED'}
              onCheckedChange={(checked) => setScoringMode(checked ? 'INVERTED' : 'NORMAL')}
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label>Afficher tours</Label>
            <Switch checked={showTurns} onCheckedChange={setShowTurns} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label>Afficher résultats intermédiaires</Label>
            <Switch checked={showIntermediate} onCheckedChange={setShowIntermediate} />
          </div>
        </div>

        {/* Player selection */}
        <div className="space-y-3">
          <Label>
            Joueurs * {selectedModel
              ? `(${selectedModel.minPlayers} à ${selectedModel.maxPlayers})`
              : '(min. 2)'}
          </Label>
          {players.length === 0 ? (
            <div className="text-center p-8 border rounded-lg border-dashed">
              <p className="text-sm text-muted-foreground mb-3">Aucun joueur</p>
              <Button
                type="button"
                size="sm"
                onClick={() => navigate({ to: '/players/new' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Créer un joueur
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              {players.map(player => {
                const isSelected = selectedPlayerIds.includes(player.id)
                const maxReached = !!(selectedModel?.maxPlayers && selectedPlayerIds.length >= selectedModel.maxPlayers && !isSelected)

                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={maxReached}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors touch-manipulation ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : maxReached
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => togglePlayer(player.id)}
                  >
                    <PlayerAvatar
                      type={player.avatarType}
                      value={player.avatarValue}
                      color={player.color}
                      name={player.name}
                      size="sm"
                    />
                    <span className="flex-1 text-left font-medium">{player.name}</span>
                    {isSelected && (
                      <X className="h-4 w-4 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedPlayerIds.length} joueur{selectedPlayerIds.length > 1 ? 's' : ''} sélectionné{selectedPlayerIds.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/games' })}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={
              !gameName.trim() ||
              selectedPlayerIds.length < (selectedModel?.minPlayers || 2) ||
              (selectedModel?.maxPlayers && selectedPlayerIds.length > selectedModel.maxPlayers) ||
              isSubmitting
            }
            className="flex-1"
          >
            {isSubmitting ? 'Création...' : 'Démarrer la partie'}
          </Button>
        </div>
      </form>
    </div>
  )
}
