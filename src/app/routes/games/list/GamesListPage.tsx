import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { GameCard } from '@/components/game/GameCard'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import type { Game, Player } from '@/data/db'

interface GameWithData {
  game: Game
  players: Player[]
  turnCount: number
}

export function GamesListPage() {
  const games = useLiveQuery(() => gamesRepository.getAll(), [])
  const [gamesWithData, setGamesWithData] = useState<GameWithData[]>([])
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'finished'>('all')

  useEffect(() => {
    if (!games) return

    const loadGameData = async () => {
      const withData = await Promise.all(
        games.map(async (game) => {
          const gamePlayers = await gamesRepository.getGamePlayers(game.id)
          const turns = await gamesRepository.getTurns(game.id)
          return {
            game,
            players: gamePlayers.map(gp => gp.player),
            turnCount: turns.length
          }
        })
      )
      setGamesWithData(withData)
    }

    loadGameData()
  }, [games])

  if (!games) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  const filteredGames = gamesWithData.filter(({ game }) => {
    if (filter === 'in_progress') return game.status === 'IN_PROGRESS'
    if (filter === 'finished') return game.status === 'FINISHED'
    return true
  })

  const inProgressCount = gamesWithData.filter(({ game }) => game.status === 'IN_PROGRESS').length
  const finishedCount = gamesWithData.filter(({ game }) => game.status === 'FINISHED').length

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parties</h1>
          <p className="text-sm text-muted-foreground">
            {inProgressCount} en cours · {finishedCount} terminée{finishedCount > 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/games/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Toutes ({gamesWithData.length})
        </Button>
        <Button
          variant={filter === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('in_progress')}
        >
          En cours ({inProgressCount})
        </Button>
        <Button
          variant={filter === 'finished' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('finished')}
        >
          Terminées ({finishedCount})
        </Button>
      </div>

      {/* Games list */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {filter === 'all' ? 'Aucune partie' : `Aucune partie ${filter === 'in_progress' ? 'en cours' : 'terminée'}`}
          </p>
          {filter === 'all' && (
            <Link to="/games/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première partie
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGames.map(({ game, players, turnCount }) => (
            <GameCard
              key={game.id}
              game={game}
              players={players}
              turnCount={turnCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
