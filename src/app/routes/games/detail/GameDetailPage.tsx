import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { ScoreGrid } from '@/components/game/ScoreGrid'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { ArrowLeft, Trophy } from 'lucide-react'
import type { Game, Player, Turn } from '@/data/db'

interface GameWithData {
  game: Game
  players: Array<{ id: string; player: Player; sortOrder: number }>
  turns: Turn[]
}

export function GameDetailPage() {
  const navigate = useNavigate()
  const { gameId } = useParams({ strict: false }) as { gameId: string }
  const [gameData, setGameData] = useState<GameWithData | null>(null)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [finishReason, setFinishReason] = useState<string>('')
  const [isManualFinish, setIsManualFinish] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEditingScore, setIsEditingScore] = useState(false)

  const game = useLiveQuery(
    () => gamesRepository.getById(gameId),
    [gameId]
  )

  useEffect(() => {
    if (!gameId) return

    const loadGameData = async () => {
      const g = await gamesRepository.getById(gameId)
      if (!g) {
        navigate({ to: '/games' })
        return
      }

      if (g.status === 'FINISHED') {
        navigate({ to: '/games/$gameId/results', params: { gameId } })
        return
      }

      const players = await gamesRepository.getGamePlayers(gameId)
      const turns = await gamesRepository.getTurns(gameId)

      setGameData({
        game: g,
        players,
        turns
      })

      // Check end conditions
      const endCheck = await gamesRepository.checkEndConditions(gameId)
      if (endCheck.shouldEnd) {
        if (endCheck.reason === 'score_limit') {
          setFinishReason('Le score limite a été atteint !')
        } else if (endCheck.reason === 'turn_limit') {
          setFinishReason('Le nombre de tours limite a été atteint !')
        }
        setIsManualFinish(false)
        setShowFinishDialog(true)
      }
    }

    loadGameData()
  }, [gameId, navigate, game])

  const handleFinishGame = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!gameId) return

    setShowFinishDialog(false)

    const winnerId = await gamesRepository.getWinner(gameId)
    await gamesRepository.finishGame(gameId, winnerId)
    navigate({ to: '/games/$gameId/results', params: { gameId } })
  }

  const handleContinuePlaying = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setShowFinishDialog(false)

    // Create a new turn if needed so the user can continue entering scores
    if (!isManualFinish && gameId) {
      const turns = await gamesRepository.getTurns(gameId)
      const players = await gamesRepository.getGamePlayers(gameId)

      if (turns.length > 0 && players.length > 0) {
        // Check if the last turn has all scores entered
        const lastTurn = turns[turns.length - 1]
        const scores = await gamesRepository.getTurnScores(lastTurn.id)
        const allScoresEntered = players.every(p =>
          scores.some(s => s.playerId === p.playerId)
        )

        // If all scores are entered, create the next turn
        if (allScoresEntered) {
          await gamesRepository.createTurn(gameId, turns.length)
          setRefreshKey(k => k + 1)
        }
      }
    }
  }

  const handleTurnComplete = async () => {
    // Vérifier les conditions de fin après chaque tour complété
    const endCheck = await gamesRepository.checkEndConditions(gameId)
    if (endCheck.shouldEnd) {
      if (endCheck.reason === 'score_limit') {
        setFinishReason('Le score limite a été atteint !')
      } else if (endCheck.reason === 'turn_limit') {
        setFinishReason('Le nombre de tours limite a été atteint !')
      }
      setIsManualFinish(false)
      setShowFinishDialog(true)
    }
  }

  const handleManualFinish = () => {
    setFinishReason('Voulez-vous vraiment terminer cette partie maintenant ?')
    setIsManualFinish(true)
    setShowFinishDialog(true)
  }

  if (!gameData) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  const { game: currentGame } = gameData

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header - Masqué pendant l'édition pour maximiser l'espace */}
      {!isEditingScore && (
        <div className="border-b bg-card shadow-sm safe-top">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/games' })}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualFinish}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Terminer
              </Button>
            </div>
            <h1 className="text-xl font-bold">
              {currentGame.title || currentGame.gameName}
            </h1>
            {currentGame.title && (
              <p className="text-sm text-muted-foreground">{currentGame.gameName}</p>
            )}
          </div>
        </div>
      )}

      {/* Score Grid */}
      <div className="flex-1 overflow-hidden">
        <ScoreGrid
          key={refreshKey}
          gameId={gameId}
          onTurnComplete={handleTurnComplete}
          onEditingChange={setIsEditingScore}
        />
      </div>

      {/* Finish dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Terminer la partie ?
            </DialogTitle>
            <DialogDescription>
              {finishReason}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleContinuePlaying}>
              {isManualFinish ? 'Annuler' : 'Continuer et ignorer'}
            </Button>
            <Button onClick={handleFinishGame}>
              Terminer la partie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
