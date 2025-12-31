import { db, type Game, type GamePlayer, type Turn, type TurnScore, type Player, generateId, now } from '../db'

export const gamesRepository = {
  // Games
  async getAll(): Promise<Game[]> {
    return db.games
      .filter(g => !g.deletedAt)
      .reverse()
      .sortBy('startedAt')
  },

  async getById(id: string): Promise<Game | undefined> {
    const game = await db.games.get(id)
    return game && !game.deletedAt ? game : undefined
  },

  async create(data: {
    modelId?: string
    title?: string
    gameName: string
    scoreLimit?: number
    turnLimit?: number
    entryMode: 'ROUND_ALL' | 'TURN_BY_PLAYER'
    scoringMode: 'NORMAL' | 'INVERTED'
    showTurns: boolean
    showIntermediate: boolean
    playerIds: string[]
  }): Promise<Game> {
    const game: Game = {
      id: generateId(),
      modelId: data.modelId,
      title: data.title,
      gameName: data.gameName,
      status: 'IN_PROGRESS',
      scoreLimit: data.scoreLimit,
      turnLimit: data.turnLimit,
      entryMode: data.entryMode,
      scoringMode: data.scoringMode,
      showTurns: data.showTurns,
      showIntermediate: data.showIntermediate,
      startedAt: now(),
      createdAt: now(),
      updatedAt: now(),
      dirty: true
    }

    await db.games.add(game)

    // Add game players
    for (let i = 0; i < data.playerIds.length; i++) {
      const gamePlayer: GamePlayer = {
        id: generateId(),
        gameId: game.id,
        playerId: data.playerIds[i],
        sortOrder: i,
        createdAt: now(),
        updatedAt: now(),
        dirty: true
      }
      await db.gamePlayers.add(gamePlayer)
    }

    return game
  },

  async update(id: string, data: Partial<Omit<Game, 'id' | 'createdAt'>>): Promise<void> {
    await db.games.update(id, {
      ...data,
      updatedAt: now(),
      dirty: true
    })
  },

  async finishGame(gameId: string, winnerPlayerId?: string): Promise<void> {
    await db.games.update(gameId, {
      status: 'FINISHED',
      finishedAt: now(),
      winnerPlayerId,
      updatedAt: now(),
      dirty: true
    })
  },

  async softDelete(id: string): Promise<void> {
    await db.games.update(id, {
      deletedAt: now(),
      updatedAt: now(),
      dirty: true
    })
  },

  // Game Players
  async getGamePlayers(gameId: string): Promise<Array<GamePlayer & { player: Player }>> {
    const gamePlayers = await db.gamePlayers
      .where('gameId')
      .equals(gameId)
      .filter(gp => !gp.deletedAt)
      .sortBy('sortOrder')

    const result = []
    for (const gp of gamePlayers) {
      const player = await db.players.get(gp.playerId)
      if (player && !player.deletedAt) {
        result.push({ ...gp, player })
      }
    }
    return result
  },

  // Turns
  async getTurns(gameId: string): Promise<Turn[]> {
    return db.turns
      .where('gameId')
      .equals(gameId)
      .filter(t => !t.deletedAt)
      .sortBy('turnIndex')
  },

  async createTurn(gameId: string, turnIndex: number, currentPlayerId?: string): Promise<Turn> {
    const turn: Turn = {
      id: generateId(),
      gameId,
      turnIndex,
      currentPlayerId,
      createdAt: now(),
      updatedAt: now(),
      dirty: true
    }
    await db.turns.add(turn)
    return turn
  },

  async deleteTurn(turnId: string): Promise<void> {
    // Soft delete turn and all its scores
    await db.turns.update(turnId, {
      deletedAt: now(),
      updatedAt: now(),
      dirty: true
    })

    const scores = await db.turnScores.where('turnId').equals(turnId).toArray()
    for (const score of scores) {
      await db.turnScores.update(score.id, {
        deletedAt: now(),
        updatedAt: now(),
        dirty: true
      })
    }
  },

  // Turn Scores
  async getTurnScores(turnId: string): Promise<TurnScore[]> {
    return db.turnScores
      .where('turnId')
      .equals(turnId)
      .filter(ts => !ts.deletedAt)
      .toArray()
  },

  async setTurnScore(turnId: string, playerId: string, points: number): Promise<void> {
    const existing = await db.turnScores
      .where('[turnId+playerId]')
      .equals([turnId, playerId])
      .filter(ts => !ts.deletedAt)
      .first()

    if (existing) {
      await db.turnScores.update(existing.id, {
        points,
        updatedAt: now(),
        dirty: true
      })
    } else {
      const turnScore: TurnScore = {
        id: generateId(),
        turnId,
        playerId,
        points,
        createdAt: now(),
        updatedAt: now(),
        dirty: true
      }
      await db.turnScores.add(turnScore)
    }
  },

  // Totals calculation
  async calculateTotals(gameId: string): Promise<Record<string, number>> {
    const turns = await this.getTurns(gameId)
    const totals: Record<string, number> = {}

    for (const turn of turns) {
      const scores = await this.getTurnScores(turn.id)
      for (const score of scores) {
        totals[score.playerId] = (totals[score.playerId] || 0) + score.points
      }
    }

    return totals
  },

  async getWinner(gameId: string): Promise<string | undefined> {
    const game = await this.getById(gameId)
    if (!game) return undefined

    const totals = await this.calculateTotals(gameId)
    const entries = Object.entries(totals)
    if (entries.length === 0) return undefined

    if (game.scoringMode === 'INVERTED') {
      // Lowest score wins
      return entries.reduce((min, curr) => curr[1] < min[1] ? curr : min)[0]
    } else {
      // Highest score wins
      return entries.reduce((max, curr) => curr[1] > max[1] ? curr : max)[0]
    }
  },

  // Check end conditions
  async checkEndConditions(gameId: string): Promise<{
    shouldEnd: boolean
    reason?: 'score_limit' | 'turn_limit'
  }> {
    const game = await this.getById(gameId)
    if (!game) return { shouldEnd: false }

    const turns = await this.getTurns(gameId)
    const turnCount = turns.length

    // Check turn limit
    if (game.turnLimit && turnCount >= game.turnLimit) {
      return { shouldEnd: true, reason: 'turn_limit' }
    }

    // Check score limit
    if (game.scoreLimit) {
      const totals = await this.calculateTotals(gameId)
      const hasReachedLimit = Object.values(totals).some(total => {
        if (game.scoringMode === 'INVERTED') {
          return total <= game.scoreLimit!
        } else {
          return total >= game.scoreLimit!
        }
      })
      if (hasReachedLimit) {
        return { shouldEnd: true, reason: 'score_limit' }
      }
    }

    return { shouldEnd: false }
  },

  // Replay game
  async replayGame(gameId: string): Promise<Game> {
    const originalGame = await this.getById(gameId)
    if (!originalGame) throw new Error('Game not found')

    const gamePlayers = await this.getGamePlayers(gameId)
    const playerIds = gamePlayers.map(gp => gp.playerId)

    return this.create({
      modelId: originalGame.modelId,
      title: originalGame.title,
      gameName: originalGame.gameName,
      scoreLimit: originalGame.scoreLimit,
      turnLimit: originalGame.turnLimit,
      entryMode: originalGame.entryMode,
      scoringMode: originalGame.scoringMode,
      showTurns: originalGame.showTurns,
      showIntermediate: originalGame.showIntermediate,
      playerIds
    })
  }
}
