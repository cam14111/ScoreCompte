import type { GameModel } from './db'

export interface PredefinedModel extends Omit<GameModel, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'dirty'> {
  predefinedId: string
}

export const PREDEFINED_MODELS: PredefinedModel[] = [
  {
    predefinedId: 'skyjo',
    name: 'Skyjo',
    minPlayers: 2,
    maxPlayers: 8,
    scoringMode: 'INVERTED',
    scoreLimit: 100,
    turnLimit: undefined,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  },
  {
    predefinedId: '6-qui-prend',
    name: '6 qui prend!',
    minPlayers: 2,
    maxPlayers: 10,
    scoringMode: 'INVERTED',
    scoreLimit: 66,
    turnLimit: undefined,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  },
  {
    predefinedId: 'papayoo',
    name: 'Papayoo',
    minPlayers: 3,
    maxPlayers: 8,
    scoringMode: 'INVERTED',
    scoreLimit: undefined,
    turnLimit: 5,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  },
  {
    predefinedId: 'flip-7',
    name: 'Flip 7',
    minPlayers: 3,
    maxPlayers: 18,
    scoringMode: 'NORMAL',
    scoreLimit: 200,
    turnLimit: undefined,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  },
  {
    predefinedId: '5-rois',
    name: '5 Rois',
    minPlayers: 2,
    maxPlayers: 7,
    scoringMode: 'INVERTED',
    scoreLimit: undefined,
    turnLimit: 11,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  },
  {
    predefinedId: 'dekal',
    name: 'DEKAL',
    minPlayers: 2,
    maxPlayers: 6,
    scoringMode: 'INVERTED',
    scoreLimit: undefined,
    turnLimit: 16,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  },
  {
    predefinedId: 'tarot',
    name: 'Tarot',
    minPlayers: 3,
    maxPlayers: 5,
    scoringMode: 'NORMAL',
    scoreLimit: undefined,
    turnLimit: undefined,
    showTurns: true,
    showIntermediate: true,
    isPredefined: true,
    isHidden: false
  }
]
