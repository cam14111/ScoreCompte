import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Trophy, Users, Hash, TrendingDown, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useConfirm } from '@/hooks/useDialog'
import type { Game, Player } from '@/data/db'

interface GameCardProps {
  game: Game
  players: Player[]
  turnCount?: number
  winner?: Player
  onDelete?: (gameId: string) => void
}

export function GameCard({ game, players, turnCount = 0, winner, onDelete }: GameCardProps) {
  const isFinished = game.status === 'FINISHED'
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onDelete) return

    const confirmed = await confirm({
      title: 'Supprimer la partie',
      message: `Supprimer la partie "${game.title || game.gameName}" ?\n\nCette action est irréversible.`,
      destructive: true,
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    })

    if (confirmed) {
      onDelete(game.id)
    }
  }

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
      <div className="relative">
        <Link to={isFinished ? '/games/$gameId/results' : '/games/$gameId'} params={{ gameId: game.id }}>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {game.title || game.gameName}
                </CardTitle>
                {game.title && (
                  <p className="text-sm text-muted-foreground mt-1">{game.gameName}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isFinished && winner && (
                  <span className="text-sm font-medium text-foreground">{winner.name}</span>
                )}
                {isFinished && (
                  <Trophy className="h-5 w-5 text-yellow-500" />
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>

          <CardDescription>
            {/* Players */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                {players.slice(0, 4).map((player) => (
                  <div key={player.id} className="ring-2 ring-background rounded-full">
                    <PlayerAvatar
                      type={player.avatarType}
                      value={player.avatarValue}
                      color={player.color}
                      name={player.name}
                      size="sm"
                    />
                  </div>
                ))}
                {players.length > 4 && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
                    +{players.length - 4}
                  </div>
                )}
              </div>
              <span className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                {players.length}
              </span>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 text-xs">
              {turnCount > 0 && (
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  {turnCount} {turnCount > 1 ? 'tours' : 'tour'}
                </span>
              )}
              {game.scoringMode === 'INVERTED' && (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Inversé
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(game.startedAt), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
            </div>
          </CardDescription>
          </CardHeader>
        </Card>
      </Link>
      </div>
    </>
  )
}
