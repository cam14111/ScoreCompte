import { useEffect, useState } from 'react'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Trophy, Trash2, Plus } from 'lucide-react'
import type { Player, Turn } from '@/data/db'

interface ScoreGridProps {
  gameId: string
}

interface PlayerColumn {
  playerId: string
  player: Player
  sortOrder: number
}

interface TurnRow {
  turn: Turn
  scores: Record<string, number>
}

export function ScoreGrid({ gameId }: ScoreGridProps) {
  const [players, setPlayers] = useState<PlayerColumn[]>([])
  const [turns, setTurns] = useState<TurnRow[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [editingCell, setEditingCell] = useState<{ turnId: string; playerId: string } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [scoringMode, setScoringMode] = useState<'NORMAL' | 'INVERTED'>('NORMAL')

  useEffect(() => {
    loadGameData()
  }, [gameId])

  const loadGameData = async () => {
    const game = await gamesRepository.getById(gameId)
    if (!game) return

    setScoringMode(game.scoringMode)

    const gamePlayers = await gamesRepository.getGamePlayers(gameId)
    setPlayers(gamePlayers)

    let gameTurns = await gamesRepository.getTurns(gameId)

    // Créer automatiquement le premier tour si aucun tour n'existe
    if (gameTurns.length === 0) {
      await gamesRepository.createTurn(gameId, 0)
      gameTurns = await gamesRepository.getTurns(gameId)
    }

    const turnsWithScores = await Promise.all(
      gameTurns.map(async (turn) => {
        const scores = await gamesRepository.getTurnScores(turn.id)
        const scoresMap: Record<string, number> = {}
        scores.forEach(score => {
          scoresMap[score.playerId] = score.points
        })
        return { turn, scores: scoresMap }
      })
    )
    setTurns(turnsWithScores)

    const totalsMap = await gamesRepository.calculateTotals(gameId)
    setTotals(totalsMap)
  }

  const handleCellClick = (turnId: string, playerId: string, currentValue?: number) => {
    setEditingCell({ turnId, playerId })
    setInputValue(currentValue !== undefined ? String(currentValue) : '')
  }

  const handleSaveScore = async () => {
    if (!editingCell) return

    const points = parseInt(inputValue) || 0
    const currentTurnId = editingCell.turnId
    const currentPlayerId = editingCell.playerId

    // Trouver l'index du tour et du joueur actuels AVANT la sauvegarde
    const currentTurnIndex = turns.findIndex(t => t.turn.id === currentTurnId)
    const currentPlayerIndex = players.findIndex(p => p.playerId === currentPlayerId)

    if (currentTurnIndex === -1 || currentPlayerIndex === -1) {
      return
    }

    // Sauvegarder le score
    await gamesRepository.setTurnScore(currentTurnId, currentPlayerId, points)

    // Vérifier si tous les scores du tour actuel sont maintenant saisis
    const currentTurnScores = await gamesRepository.getTurnScores(currentTurnId)
    const allScoresEntered = currentTurnScores.length === players.length

    let nextTurnId: string
    let nextPlayerId: string
    let nextValue: number | undefined

    // S'il y a un joueur suivant dans le même tour
    if (currentPlayerIndex < players.length - 1) {
      const nextPlayer = players[currentPlayerIndex + 1]
      nextTurnId = currentTurnId
      nextPlayerId = nextPlayer.playerId
      nextValue = turns[currentTurnIndex].scores[nextPlayerId]
    }
    // Sinon, si tous les scores sont saisis, créer le tour suivant et passer au premier joueur
    else if (allScoresEntered) {
      const nextTurnIndex = turns.length
      const newTurn = await gamesRepository.createTurn(gameId, nextTurnIndex)
      nextTurnId = newTurn.id
      nextPlayerId = players[0].playerId
      nextValue = undefined
    }
    // Sinon, rester sur le dernier joueur (tour incomplet)
    else {
      nextTurnId = currentTurnId
      nextPlayerId = players[0].playerId
      nextValue = turns[currentTurnIndex].scores[nextPlayerId]
    }

    // Recharger les données pour afficher les changements
    await loadGameData()

    // Mettre le focus sur la cellule suivante
    setEditingCell({ turnId: nextTurnId, playerId: nextPlayerId })
    setInputValue(nextValue !== undefined ? String(nextValue) : '')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveScore()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setInputValue('')
    }
  }

  const handleAddTurn = async () => {
    const nextIndex = turns.length
    await gamesRepository.createTurn(gameId, nextIndex)
    loadGameData()
  }

  const handleDeleteTurn = async (turnId: string) => {
    if (confirm('Supprimer ce tour ?')) {
      await gamesRepository.deleteTurn(turnId)
      loadGameData()
    }
  }

  const getWinnerIds = (): string[] => {
    const entries = Object.entries(totals)
    if (entries.length === 0) return []

    if (scoringMode === 'INVERTED') {
      const minScore = Math.min(...entries.map(([, score]) => score))
      return entries.filter(([, score]) => score === minScore).map(([id]) => id)
    } else {
      const maxScore = Math.max(...entries.map(([, score]) => score))
      return entries.filter(([, score]) => score === maxScore).map(([id]) => id)
    }
  }

  const winnerIds = getWinnerIds()

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-card z-10 border-b-2">
            <tr>
              <th className="border p-2 text-center bg-muted font-medium w-12">#</th>
              {players.map(({ playerId, player }) => (
                <th key={playerId} className="border p-2 min-w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <PlayerAvatar
                      type={player.avatarType}
                      value={player.avatarValue}
                      color={player.color}
                      name={player.name}
                      size="sm"
                    />
                    <span className="text-xs font-medium truncate max-w-[70px]">
                      {player.name}
                    </span>
                  </div>
                </th>
              ))}
              <th className="border p-2 w-12 bg-muted"></th>
            </tr>
          </thead>
          <tbody>
            {turns.map(({ turn, scores }, index) => (
              <tr key={turn.id} className="hover:bg-accent/50">
                <td className="border p-2 text-center font-medium text-muted-foreground">
                  {index + 1}
                </td>
                {players.map(({ playerId }) => {
                  const isEditing = editingCell?.turnId === turn.id && editingCell?.playerId === playerId
                  const value = scores[playerId]

                  return (
                    <td
                      key={playerId}
                      className={cn(
                        'border p-0 text-center cursor-pointer transition-colors',
                        isEditing && 'bg-primary/20'
                      )}
                      onClick={() => !isEditing && handleCellClick(turn.id, playerId, value)}
                    >
                      {isEditing ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-full h-full p-2 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleSaveScore}
                          onKeyDown={handleKeyPress}
                          autoFocus
                        />
                      ) : (
                        <div className="p-2 min-h-[40px] flex items-center justify-center">
                          {value !== undefined ? value : '-'}
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="border p-1 bg-muted">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteTurn(turn.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-card border-t-2">
            <tr className="font-bold">
              <td className="border p-2 text-center bg-muted">
                <Trophy className="h-4 w-4 inline" />
              </td>
              {players.map(({ playerId }) => {
                const isWinner = winnerIds.includes(playerId)
                return (
                  <td
                    key={playerId}
                    className={cn(
                      'border p-2 text-center text-lg',
                      isWinner && 'bg-yellow-500/20'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                      <span>{totals[playerId] || 0}</span>
                    </div>
                  </td>
                )
              })}
              <td className="border bg-muted"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Turn Button */}
      <div className="border-t p-4 bg-card safe-bottom">
        <Button
          onClick={handleAddTurn}
          className="w-full"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un tour
        </Button>
      </div>
    </div>
  )
}
