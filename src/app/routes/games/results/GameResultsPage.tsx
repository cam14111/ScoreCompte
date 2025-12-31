import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { Podium } from '@/components/game/Podium'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ArrowLeft, RotateCw, Trophy } from 'lucide-react'
import { useAlertDialog } from '@/contexts/AlertContext'
import type { Player } from '@/data/db'

interface PlayerResult {
  player: Player
  score: number
  rank: number
}

export function GameResultsPage() {
  const navigate = useNavigate()
  const { showAlert } = useAlertDialog()
  const { gameId } = useParams({ strict: false }) as { gameId: string }
  const [results, setResults] = useState<PlayerResult[]>([])
  const [gameName, setGameName] = useState('')
  const [gameTitle, setGameTitle] = useState<string | undefined>()
  const [isReplaying, setIsReplaying] = useState(false)

  useEffect(() => {
    if (!gameId) return

    const loadResults = async () => {
      const game = await gamesRepository.getById(gameId)
      if (!game) {
        navigate({ to: '/games' })
        return
      }

      setGameName(game.gameName)
      setGameTitle(game.title)

      const gamePlayers = await gamesRepository.getGamePlayers(gameId)
      const totals = await gamesRepository.calculateTotals(gameId)

      const playerScores = gamePlayers.map(({ player }) => ({
        player,
        score: totals[player.id] || 0
      }))

      // Sort by score
      const sorted = game.scoringMode === 'INVERTED'
        ? playerScores.sort((a, b) => a.score - b.score)
        : playerScores.sort((a, b) => b.score - a.score)

      // Assign ranks
      let currentRank = 1
      const withRanks = sorted.map((item, index) => {
        if (index > 0 && item.score !== sorted[index - 1].score) {
          currentRank = index + 1
        }
        return { ...item, rank: currentRank }
      })

      setResults(withRanks)
    }

    loadResults()
  }, [gameId, navigate])

  const handleReplay = async () => {
    if (!gameId) return

    setIsReplaying(true)
    try {
      const newGame = await gamesRepository.replayGame(gameId)
      navigate({ to: '/games/$gameId', params: { gameId: newGame.id } })
    } catch (error) {
      console.error('Error replaying game:', error)
      showAlert({
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la création de la nouvelle partie.',
        type: 'error'
      })
    } finally{
      setIsReplaying(false)
    }
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/games' })}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">{gameTitle || gameName}</h1>
        {gameTitle && (
          <p className="text-sm text-muted-foreground">{gameName}</p>
        )}
      </div>

      {/* Podium */}
      {results.length >= 1 && (
        <Card>
          <CardContent className="p-0">
            <Podium players={results} />
          </CardContent>
        </Card>
      )}

      {/* Full ranking */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Classement complet
        </h2>
        <div className="space-y-2">
          {results.map(({ player, score, rank }) => (
            <Card key={player.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {rank}
                  </div>
                  <PlayerAvatar
                    type={player.avatarType}
                    value={player.avatarValue}
                    color={player.color}
                    name={player.name}
                    size="md"
                  />
                  <span className="flex-1 font-semibold">{player.name}</span>
                  <span className="text-2xl font-bold">{score}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/games' })}
          className="flex-1"
        >
          Terminer
        </Button>
        <Button
          onClick={handleReplay}
          disabled={isReplaying}
          className="flex-1"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          {isReplaying ? 'Création...' : 'Jouer à nouveau'}
        </Button>
      </div>
    </div>
  )
}
