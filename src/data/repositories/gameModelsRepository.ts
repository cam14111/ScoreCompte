import { db, type GameModel, generateId, now } from '../db'

export const gameModelsRepository = {
  async getAll(): Promise<GameModel[]> {
    return db.gameModels
      .filter(m => !m.deletedAt)
      .sortBy('name')
  },

  async getById(id: string): Promise<GameModel | undefined> {
    const model = await db.gameModels.get(id)
    return model && !model.deletedAt ? model : undefined
  },

  async create(data: {
    name: string
    minPlayers: number
    maxPlayers: number
    entryMode: 'ROUND_ALL' | 'TURN_BY_PLAYER'
    scoringMode: 'NORMAL' | 'INVERTED'
    rules?: any
  }): Promise<GameModel> {
    const model: GameModel = {
      id: generateId(),
      ...data,
      createdAt: now(),
      updatedAt: now(),
      dirty: true
    }

    await db.gameModels.add(model)
    return model
  },

  async update(id: string, data: Partial<Omit<GameModel, 'id' | 'createdAt'>>): Promise<void> {
    await db.gameModels.update(id, {
      ...data,
      updatedAt: now(),
      dirty: true
    })
  },

  async softDelete(id: string): Promise<void> {
    await db.gameModels.update(id, {
      deletedAt: now(),
      updatedAt: now(),
      dirty: true
    })
  },

  async hardDelete(id: string): Promise<void> {
    await db.gameModels.delete(id)
  },

  async canDelete(modelId: string): Promise<boolean> {
    const gamesUsingModel = await db.games
      .where('modelId')
      .equals(modelId)
      .filter(g => !g.deletedAt && g.status === 'IN_PROGRESS')
      .count()

    return gamesUsingModel === 0
  }
}
