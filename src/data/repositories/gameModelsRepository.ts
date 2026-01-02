import { db, type GameModel, generateId, now } from '../db'
import { PREDEFINED_MODELS } from '../predefinedModels'

export const gameModelsRepository = {
  async getAll(includeHidden = false): Promise<GameModel[]> {
    return db.gameModels
      .filter(m => !m.deletedAt && (includeHidden || !m.isHidden))
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
    scoringMode: 'NORMAL' | 'INVERTED'
    scoreLimit?: number
    turnLimit?: number
    showTurns: boolean
    showIntermediate: boolean
    rules?: any
  }): Promise<GameModel> {
    const model: GameModel = {
      id: generateId(),
      ...data,
      isPredefined: false,
      isHidden: false,
      createdAt: now(),
      updatedAt: now()
    }

    await db.gameModels.add(model)
    return model
  },

  async update(id: string, data: Partial<Omit<GameModel, 'id' | 'createdAt'>>): Promise<void> {
    await db.gameModels.update(id, {
      ...data,
      updatedAt: now()
    })
  },

  async softDelete(id: string): Promise<void> {
    // Check if it's a predefined model - they can't be deleted, only hidden
    const model = await this.getById(id)
    if (model?.isPredefined) {
      throw new Error('Les modèles prédéfinis ne peuvent pas être supprimés. Utilisez "Masquer" à la place.')
    }

    await db.gameModels.update(id, {
      deletedAt: now(),
      updatedAt: now()
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
  },

  async hide(id: string): Promise<void> {
    await db.gameModels.update(id, {
      isHidden: true,
      updatedAt: now()
    })
  },

  async show(id: string): Promise<void> {
    await db.gameModels.update(id, {
      isHidden: false,
      updatedAt: now()
    })
  },

  async restore(id: string): Promise<void> {
    const model = await this.getById(id)
    if (!model?.isPredefined || !model.predefinedId) {
      throw new Error('Ce modèle ne peut pas être restauré car ce n\'est pas un modèle prédéfini.')
    }

    const predefinedData = PREDEFINED_MODELS.find(m => m.predefinedId === model.predefinedId)
    if (!predefinedData) {
      throw new Error('Impossible de trouver les paramètres prédéfinis pour ce modèle.')
    }

    await db.gameModels.update(id, {
      name: predefinedData.name,
      minPlayers: predefinedData.minPlayers,
      maxPlayers: predefinedData.maxPlayers,
      scoringMode: predefinedData.scoringMode,
      scoreLimit: predefinedData.scoreLimit,
      turnLimit: predefinedData.turnLimit,
      showTurns: predefinedData.showTurns,
      showIntermediate: predefinedData.showIntermediate,
      updatedAt: now()
    })
  }
}
