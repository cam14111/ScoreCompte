import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardHeader } from '@/components/ui/Card'
import { PlayerAvatar } from './PlayerAvatar'
import type { Player } from '@/data/db'
import { Trophy, GamepadIcon } from 'lucide-react'

interface PlayerCardProps {
  player: Player
  stats?: {
    totalGames: number
    finishedGames: number
    wins: number
  }
}

export const PlayerCard = memo(function PlayerCard({ player, stats }: PlayerCardProps) {
  return (
    <Link to="/players/$playerId" params={{ playerId: player.id }}>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <PlayerAvatar
              type={player.avatarType}
              value={player.avatarValue}
              color={player.color}
              name={player.name}
              size="lg"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{player.name}</h3>
              {stats && (
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GamepadIcon className="h-3.5 w-3.5" />
                    {stats.totalGames} {stats.totalGames > 1 ? 'parties' : 'partie'}
                  </span>
                  {stats.wins > 0 && (
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Trophy className="h-3.5 w-3.5" />
                      {stats.wins} {stats.wins > 1 ? 'victoires' : 'victoire'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
})
