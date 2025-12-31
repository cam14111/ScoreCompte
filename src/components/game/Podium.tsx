import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Player } from '@/data/db'

interface PodiumProps {
  players: Array<{
    player: Player
    score: number
    rank: number
  }>
}

export function Podium({ players }: PodiumProps) {
  const top3 = players.slice(0, 3)
  const podiumOrder = [
    top3[1], // 2nd place (left)
    top3[0], // 1st place (center)
    top3[2], // 3rd place (right)
  ].filter(Boolean)

  const trophyColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']

  // Calculer les hauteurs proportionnelles aux scores
  const scores = top3.map(p => p?.score || 0).filter(s => s > 0)
  const maxScore = Math.max(...scores, 1) // Éviter division par zéro
  const minHeight = 80  // 20 * 4 = 80px (h-20)
  const maxHeight = 160 // 40 * 4 = 160px (h-40)

  const getHeight = (score: number): number => {
    if (maxScore === 0) return minHeight
    return Math.round(minHeight + (score / maxScore) * (maxHeight - minHeight))
  }

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {podiumOrder.map((item, index) => {
        if (!item) return null
        const originalIndex = index === 0 ? 1 : index === 1 ? 0 : 2

        return (
          <div key={item.player.id} className="flex flex-col items-center gap-2">
            {/* Trophy */}
            <Trophy className={cn('h-6 w-6', trophyColors[originalIndex])} />

            {/* Avatar */}
            <PlayerAvatar
              type={item.player.avatarType}
              value={item.player.avatarValue}
              color={item.player.color}
              name={item.player.name}
              size="lg"
            />

            {/* Name */}
            <p className="font-semibold text-sm text-center max-w-[80px] truncate">
              {item.player.name}
            </p>

            {/* Score */}
            <p className="text-2xl font-bold">{item.score}</p>

            {/* Podium block */}
            <div
              className={cn(
                'w-20 rounded-t-lg flex items-center justify-center font-bold text-white',
                originalIndex === 0 ? 'bg-yellow-500' : originalIndex === 1 ? 'bg-gray-400' : 'bg-amber-600'
              )}
              style={{ height: `${getHeight(item.score)}px` }}
            >
              #{item.rank}
            </div>
          </div>
        )
      })}
    </div>
  )
}
