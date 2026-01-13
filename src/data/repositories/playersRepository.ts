import { db, type Player, generateId, now } from '../db'
import { markDataDirty } from './backupIntegration'

export const playersRepository = {
  async getAll(): Promise<Player[]> {
    return db.players
      .filter(p => !p.deletedAt)
      .sortBy('name')
  },

  async getById(id: string): Promise<Player | undefined> {
    const player = await db.players.get(id)
    return player && !player.deletedAt ? player : undefined
  },

  async create(data: {
    name: string
    color: string
    avatarType: 'initial' | 'icon' | 'image'
    avatarValue: string
  }): Promise<Player> {
    const player: Player = {
      id: generateId(),
      ...data,
      createdAt: now(),
      updatedAt: now()
    }

    await db.players.add(player)
    markDataDirty()
    return player
  },

  async update(id: string, data: Partial<Omit<Player, 'id' | 'createdAt'>>): Promise<void> {
    await db.players.update(id, {
      ...data,
      updatedAt: now()
    })
    markDataDirty()
  },

  async softDelete(id: string): Promise<void> {
    await db.players.update(id, {
      deletedAt: now(),
      updatedAt: now()
    })
    markDataDirty()
  },

  async hardDelete(id: string): Promise<void> {
    await db.players.delete(id)
    markDataDirty()
  },

  async getStats(playerId: string): Promise<{
    totalGames: number
    finishedGames: number
    wins: number
  }> {
    const gamePlayers = await db.gamePlayers
      .where('playerId')
      .equals(playerId)
      .filter(gp => !gp.deletedAt)
      .toArray()

    const gameIds = gamePlayers.map(gp => gp.gameId)

    const games = await db.games
      .where('id')
      .anyOf(gameIds)
      .filter(g => !g.deletedAt)
      .toArray()

    const totalGames = games.length
    const finishedGames = games.filter(g => g.status === 'FINISHED').length
    const wins = games.filter(g => g.winnerPlayerId === playerId).length

    return { totalGames, finishedGames, wins }
  },

  async getAdvancedStats(playerId: string): Promise<{
    totalGames: number
    finishedGames: number
    wins: number
    winRate: number
    averageScore: number
    averageRank: number
    bestScore: number | null
    worstScore: number | null
    totalPoints: number
    gamesHistory: Array<{
      gameId: string
      gameName: string
      title?: string
      score: number
      rank: number
      totalPlayers: number
      isWinner: boolean
      finishedAt: number
    }>
  }> {
    const gamePlayers = await db.gamePlayers
      .where('playerId')
      .equals(playerId)
      .filter(gp => !gp.deletedAt)
      .toArray()

    const gameIds = gamePlayers.map(gp => gp.gameId)

    const games = await db.games
      .where('id')
      .anyOf(gameIds)
      .filter(g => !g.deletedAt)
      .toArray()

    const finishedGames = games.filter(g => g.status === 'FINISHED')
    const totalGames = games.length
    const wins = games.filter(g => g.winnerPlayerId === playerId).length
    const winRate = finishedGames.length > 0 ? (wins / finishedGames.length) * 100 : 0

    let totalPoints = 0
    let totalRanks = 0
    let bestScore: number | null = null
    let worstScore: number | null = null
    const gamesHistory: Array<{
      gameId: string
      gameName: string
      title?: string
      score: number
      rank: number
      totalPlayers: number
      isWinner: boolean
      finishedAt: number
    }> = []

    // Calculate scores for each finished game
    for (const game of finishedGames) {
      const turns = await db.turns
        .where('gameId')
        .equals(game.id)
        .filter(t => !t.deletedAt)
        .toArray()

      let playerScore = 0
      for (const turn of turns) {
        const scores = await db.turnScores
          .where('turnId')
          .equals(turn.id)
          .filter(ts => !ts.deletedAt && ts.playerId === playerId)
          .toArray()

        playerScore += scores.reduce((sum, s) => sum + s.points, 0)
      }

      totalPoints += playerScore

      // Calculate rank for this game
      const allGamePlayers = await db.gamePlayers
        .where('gameId')
        .equals(game.id)
        .filter(gp => !gp.deletedAt)
        .toArray()

      const playerScores: Array<{ playerId: string; score: number }> = []
      for (const gp of allGamePlayers) {
        let score = 0
        for (const turn of turns) {
          const scores = await db.turnScores
            .where('turnId')
            .equals(turn.id)
            .filter(ts => !ts.deletedAt && ts.playerId === gp.playerId)
            .toArray()

          score += scores.reduce((sum, s) => sum + s.points, 0)
        }
        playerScores.push({ playerId: gp.playerId, score })
      }

      // Sort by score (consider scoring mode)
      const sorted = game.scoringMode === 'INVERTED'
        ? playerScores.sort((a, b) => a.score - b.score)
        : playerScores.sort((a, b) => b.score - a.score)

      const rank = sorted.findIndex(p => p.playerId === playerId) + 1
      totalRanks += rank

      // Update best/worst scores
      if (bestScore === null || (game.scoringMode === 'INVERTED' ? playerScore < bestScore : playerScore > bestScore)) {
        bestScore = playerScore
      }
      if (worstScore === null || (game.scoringMode === 'INVERTED' ? playerScore > worstScore : playerScore < worstScore)) {
        worstScore = playerScore
      }

      gamesHistory.push({
        gameId: game.id,
        gameName: game.gameName,
        title: game.title,
        score: playerScore,
        rank,
        totalPlayers: allGamePlayers.length,
        isWinner: game.winnerPlayerId === playerId,
        finishedAt: game.finishedAt || game.startedAt
      })
    }

    // Sort history by most recent first
    gamesHistory.sort((a, b) => b.finishedAt - a.finishedAt)

    const averageScore = finishedGames.length > 0 ? totalPoints / finishedGames.length : 0
    const averageRank = finishedGames.length > 0 ? totalRanks / finishedGames.length : 0

    return {
      totalGames,
      finishedGames: finishedGames.length,
      wins,
      winRate,
      averageScore,
      averageRank,
      bestScore,
      worstScore,
      totalPoints,
      gamesHistory
    }
  },

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase()
  }
}
