import { useEffect, useState, useRef } from 'react'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { Trophy, Trash2, Minus, ArrowLeft } from 'lucide-react'
import { useConfirm } from '@/hooks/useDialog'
import type { Player, Turn } from '@/data/db'

interface ScoreGridProps {
  gameId: string
  onTurnComplete?: () => void
  onEditingChange?: (isEditing: boolean) => void
  onBack?: () => void
  onFinish?: () => void
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

export function ScoreGrid({ gameId, onTurnComplete, onEditingChange, onBack, onFinish }: ScoreGridProps) {
  const [players, setPlayers] = useState<PlayerColumn[]>([])
  const [turns, setTurns] = useState<TurnRow[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [editingCell, setEditingCell] = useState<{ turnId: string; playerId: string } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [scoringMode, setScoringMode] = useState<'NORMAL' | 'INVERTED'>('NORMAL')
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm()

  // Ref pour gérer la transition tactile entre cellules
  const nextCellToEditRef = useRef<{ turnId: string; playerId: string; value?: number } | null>(null)

  useEffect(() => {
    loadGameData()
  }, [gameId])

  // Notifier le parent quand l'édition commence/termine
  useEffect(() => {
    onEditingChange?.(editingCell !== null)
  }, [editingCell, onEditingChange])

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
    // Si une cellule est déjà en édition, stocker la prochaine pour le blur
    if (editingCell) {
      nextCellToEditRef.current = { turnId, playerId, value: currentValue }
      return
    }

    // Sinon, ouvrir directement la cellule
    setEditingCell({ turnId, playerId })
    setInputValue(currentValue !== undefined ? String(currentValue) : '')
  }

  const handleSaveScore = async (autoAdvance: boolean = false) => {
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

    // Recharger les données pour afficher les changements
    await loadGameData()

    // Si pas d'auto-avancement (blur), simplement fermer l'édition
    if (!autoAdvance) {
      setEditingCell(null)
      setInputValue('')
      return
    }

    // === Auto-avancement uniquement sur Enter ===

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
    // Sinon, si tous les scores sont saisis, vérifier les conditions puis créer le tour suivant
    else if (allScoresEntered) {
      // Recharger d'abord pour avoir les données à jour
      await loadGameData()

      // Vérifier les conditions de fin AVANT de créer le tour suivant
      const endCheck = await gamesRepository.checkEndConditions(gameId)

      // Si la partie devrait se terminer, notifier et ne pas créer de nouveau tour
      if (endCheck.shouldEnd && onTurnComplete) {
        await onTurnComplete()
        // Ne pas créer de nouveau tour ni changer le focus
        setEditingCell(null)
        setInputValue('')
        return
      }

      // Sinon, créer le tour suivant
      const nextTurnIndex = turns.length
      const newTurn = await gamesRepository.createTurn(gameId, nextTurnIndex)
      nextTurnId = newTurn.id
      nextPlayerId = players[0].playerId
      nextValue = undefined

      // Recharger à nouveau pour obtenir le nouveau tour
      await loadGameData()
    }
    // Sinon, rester sur le dernier joueur (tour incomplet)
    else {
      nextTurnId = currentTurnId
      nextPlayerId = players[0].playerId
      nextValue = turns[currentTurnIndex].scores[nextPlayerId]
    }

    // Mettre le focus sur la cellule suivante
    setEditingCell({ turnId: nextTurnId, playerId: nextPlayerId })
    setInputValue(nextValue !== undefined ? String(nextValue) : '')
  }

  const handleBlur = async () => {
    await handleSaveScore(false) // Sauvegarde sans auto-avancement

    // Si une nouvelle cellule doit être ouverte (clic tactile pendant l'édition)
    if (nextCellToEditRef.current) {
      const { turnId, playerId, value } = nextCellToEditRef.current
      nextCellToEditRef.current = null
      setEditingCell({ turnId, playerId })
      setInputValue(value !== undefined ? String(value) : '')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      nextCellToEditRef.current = null // Annuler toute cellule en attente
      handleSaveScore(true) // Auto-avancement activé sur Enter
    } else if (e.key === 'Escape') {
      nextCellToEditRef.current = null // Annuler toute cellule en attente
      setEditingCell(null)
      setInputValue('')
    }
  }

  const handleToggleSign = () => {
    setInputValue(prev => {
      if (prev === '' || prev === '0') return '-'
      if (prev.startsWith('-')) return prev.slice(1)
      return '-' + prev
    })
  }

  const handleDeleteTurn = async (turnId: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le tour',
      message: 'Êtes-vous sûr de vouloir supprimer ce tour ?',
      destructive: true,
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    })

    if (confirmed) {
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
    <>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={handleCancel}
        title={options?.title}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        destructive={options?.destructive}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <div className="h-full flex flex-col">
        {/* Fixed Header - Outside scroll container */}
        <div className="flex-shrink-0 border-b-2 shadow-[0_2px_4px_rgba(0,0,0,0.3)] z-10" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col className="w-12" />
              {players.map(({ playerId }) => (
                <col key={playerId} style={{ minWidth: '80px' }} />
              ))}
              <col className="w-12" />
            </colgroup>
            <thead>
              <tr>
                <th className="border p-2 text-center font-medium" style={{ backgroundColor: 'hsl(var(--muted))' }}>#</th>
                {players.map(({ playerId, player }) => (
                  <th key={playerId} className="border p-2" style={{ backgroundColor: 'hsl(var(--card))' }}>
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
                <th className="border p-2" style={{ backgroundColor: 'hsl(var(--muted))' }}></th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col className="w-12" />
              {players.map(({ playerId }) => (
                <col key={playerId} style={{ minWidth: '80px' }} />
              ))}
              <col className="w-12" />
            </colgroup>
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
                          <div className="flex items-center">
                            <button
                              type="button"
                              className="p-1 h-full flex items-center justify-center hover:bg-primary/10 active:bg-primary/20 rounded-l transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault() // Empêche le blur de l'input
                                handleToggleSign()
                              }}
                              tabIndex={-1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="-?[0-9]*"
                              className="flex-1 h-full p-2 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                              value={inputValue}
                              onChange={(e) => {
                                // Accepte les chiffres et le signe moins au début
                                const val = e.target.value
                                if (val === '' || val === '-' || /^-?\d*$/.test(val)) {
                                  setInputValue(val)
                                }
                              }}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyPress}
                              autoFocus
                            />
                          </div>
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
          </table>
        </div>

        {/* Fixed Footer (Totals) - Outside scroll container */}
        <div className="flex-shrink-0 border-t-2" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col className="w-12" />
              {players.map(({ playerId }) => (
                <col key={playerId} style={{ minWidth: '80px' }} />
              ))}
              <col className="w-12" />
            </colgroup>
            <tfoot>
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

        {/* Action Buttons */}
        <div className="border-t p-4 bg-card safe-bottom">
          <div className="flex gap-3">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </Button>
            <Button
              onClick={onFinish}
              className="flex-1"
              size="lg"
            >
              <Trophy className="h-5 w-5 mr-2" />
              Terminer
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
