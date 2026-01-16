import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PlayerAvatar } from '@/components/players/PlayerAvatar'
import { playersRepository } from '@/data/repositories/playersRepository'
import { ArrowLeft, Trophy, TrendingUp, BarChart3, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Player } from '@/data/db'

export function PlayerStatsPage() {
  const { playerId } = useParams({ from: '/players/$playerId/stats' })
  const navigate = useNavigate()
  const [player, setPlayer] = useState<Player | null>(null)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof playersRepository.getAdvancedStats>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlayerAndStats()
  }, [playerId])

  const loadPlayerAndStats = async () => {
    setLoading(true)
    const playerData = await playersRepository.getById(playerId)
    if (playerData) {
      setPlayer(playerData)
      const statsData = await playersRepository.getAdvancedStats(playerId)
      setStats(statsData)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!player || !stats) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <p>Joueur non trouvé</p>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/players/$playerId', params: { playerId } })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <PlayerAvatar
            type={player.avatarType}
            value={player.avatarValue}
            color={player.color}
            name={player.name}
            size="xl"
          />
          <div>
            <h1 className="text-2xl font-bold">{player.name}</h1>
            <p className="text-sm text-muted-foreground">Statistiques détaillées</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.wins}</p>
              <p className="text-xs text-muted-foreground">Victoires</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Taux de victoire</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.averageRank.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Classement moyen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parties jouées</span>
            <span className="font-medium">{stats.totalGames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parties terminées</span>
            <span className="font-medium">{stats.finishedGames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de points</span>
            <span className="font-medium">{stats.totalPoints}</span>
          </div>
          {stats.bestScore !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meilleur score</span>
              <span className="font-medium text-green-500">{stats.bestScore}</span>
            </div>
          )}
          {stats.worstScore !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pire score</span>
              <span className="font-medium text-red-500">{stats.worstScore}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Games History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des parties</CardTitle>
          <CardDescription>{stats.gamesHistory.length} parties terminées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.gamesHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune partie terminée
              </p>
            ) : (
              stats.gamesHistory.map((game) => (
                <div
                  key={game.gameId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate({ to: '/games/$gameId/results', params: { gameId: game.gameId } })}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {game.title || game.gameName}
                      </p>
                      {game.isWinner && (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(game.finishedAt), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{game.score}</p>
                    <p className="text-xs text-muted-foreground">
                      {game.rank}e / {game.totalPlayers}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
