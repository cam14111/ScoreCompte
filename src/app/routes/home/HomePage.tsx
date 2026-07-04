import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { gamesRepository } from '@/data/repositories/gamesRepository'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { Trophy, Users, FileText, Play, Plus } from 'lucide-react'
import type { Game, Player } from '@/data/db'

interface InProgressGame {
  game: Game
  players: Player[]
  turnCount: number
}

export function HomePage() {
  const games = useLiveQuery(() => gamesRepository.getAll(), [])
  const [inProgress, setInProgress] = useState<InProgressGame[]>([])

  useEffect(() => {
    if (!games) return

    let cancelled = false
    const load = async () => {
      const current = games.filter(g => g.status === 'IN_PROGRESS').slice(0, 3)
      const withData = await Promise.all(
        current.map(async (game) => {
          const [gamePlayers, turns] = await Promise.all([
            gamesRepository.getGamePlayers(game.id),
            gamesRepository.getTurns(game.id)
          ])
          return {
            game,
            players: gamePlayers.map(gp => gp.player),
            turnCount: turns.length
          }
        })
      )
      if (!cancelled) setInProgress(withData)
    }

    load()
    return () => { cancelled = true }
  }, [games])

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Bienvenue</h1>
        <p className="text-muted-foreground">
          Gérez vos parties de jeux de société facilement
        </p>
      </div>

      {/* Parties en cours : reprise en un geste */}
      {inProgress.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Reprendre une partie
          </h2>
          {inProgress.map(({ game, players, turnCount }) => (
            <Link key={game.id} to="/games/$gameId" params={{ gameId: game.id }}>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation border-primary/40">
                <CardHeader className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {game.title || game.gameName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {turnCount} {turnCount > 1 ? 'tours' : 'tour'} · {players.length} joueurs
                      </CardDescription>
                    </div>
                    <div className="flex -space-x-2 flex-shrink-0">
                      {players.slice(0, 3).map((player) => (
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
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Nouvelle partie : action principale */}
      <Link to="/games/new">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90">
          <CardHeader className="py-4">
            <div className="flex items-center gap-3">
              <Plus className="h-8 w-8" />
              <div>
                <CardTitle className="text-primary-foreground">Nouvelle partie</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Démarrer une partie maintenant
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </Link>

      <div className="grid gap-4">
        <Link to="/games">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Parties</CardTitle>
                  <CardDescription>Créer et gérer vos parties</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/players">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Joueurs</CardTitle>
                  <CardDescription>Gérer vos joueurs</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/models">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Modèles</CardTitle>
                  <CardDescription>Modèles de jeux prédéfinis</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
