import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { playersRepository } from '@/data/repositories/playersRepository'
import { PlayerCard } from '@/components/players/PlayerCard'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import type { Player } from '@/data/db'

interface PlayerWithStats {
  player: Player
  stats: {
    totalGames: number
    finishedGames: number
    wins: number
  }
}

export function PlayersListPage() {
  const players = useLiveQuery(() => playersRepository.getAll(), [])
  const [playersWithStats, setPlayersWithStats] = useState<PlayerWithStats[]>([])

  useEffect(() => {
    if (!players) return

    const loadStats = async () => {
      const withStats = await Promise.all(
        players.map(async (player) => ({
          player,
          stats: await playersRepository.getStats(player.id)
        }))
      )
      setPlayersWithStats(withStats)
    }

    loadStats()
  }, [players])

  if (!players) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Joueurs</h1>
          <p className="text-sm text-muted-foreground">
            {players.length} {players.length > 1 ? 'joueurs' : 'joueur'}
          </p>
        </div>
        <Link to="/players/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        </Link>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Aucun joueur</p>
          <Link to="/players/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier joueur
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {playersWithStats.map(({ player, stats }) => (
            <PlayerCard key={player.id} player={player} stats={stats} />
          ))}
        </div>
      )}
    </div>
  )
}
