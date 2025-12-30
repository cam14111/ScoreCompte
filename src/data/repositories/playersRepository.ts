import { db, type Player, generateId, now } from '../db'

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
      updatedAt: now(),
      dirty: true
    }

    await db.players.add(player)
    return player
  },

  async update(id: string, data: Partial<Omit<Player, 'id' | 'createdAt'>>): Promise<void> {
    await db.players.update(id, {
      ...data,
      updatedAt: now(),
      dirty: true
    })
  },

  async softDelete(id: string): Promise<void> {
    await db.players.update(id, {
      deletedAt: now(),
      updatedAt: now(),
      dirty: true
    })
  },

  async hardDelete(id: string): Promise<void> {
    await db.players.delete(id)
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

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase()
  }
}
