import { db, generateId, now } from './db'
import { PREDEFINED_MODELS } from './predefinedModels'

const INIT_KEY = 'predefined_models_initialized'

export async function initializePredefinedModels(): Promise<void> {
  try {
    // Check if already initialized using localStorage
    const initialized = localStorage.getItem(INIT_KEY)
    if (initialized) {
      // Already initialized, skip
      return
    }

    // Add all predefined models
    for (const model of PREDEFINED_MODELS) {
      const existing = await db.gameModels
        .where('name')
        .equals(model.name)
        .and(m => m.isPredefined === true && !m.deletedAt)
        .first()

      if (!existing) {
        await db.gameModels.add({
          id: generateId(),
          name: model.name,
          minPlayers: model.minPlayers,
          maxPlayers: model.maxPlayers,
          scoringMode: model.scoringMode,
          scoreLimit: model.scoreLimit,
          turnLimit: model.turnLimit,
          showTurns: model.showTurns,
          showIntermediate: model.showIntermediate,
          isPredefined: true,
          isHidden: false,
          predefinedId: model.predefinedId,
          createdAt: now(),
          updatedAt: now()
        })
      }
    }

    // Mark as initialized
    localStorage.setItem(INIT_KEY, 'true')

    console.log('Predefined models initialized successfully')
  } catch (error) {
    console.error('Error initializing predefined models:', error)
  }
}
