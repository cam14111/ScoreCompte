import Dexie, { type Table } from 'dexie'

// Types for our database entities
export interface Player {
  id: string
  name: string
  color: string
  avatarType: 'initial' | 'icon' | 'image'
  avatarValue: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  dirty?: boolean
}

export interface GameModel {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  scoringMode: 'NORMAL' | 'INVERTED'
  scoreLimit?: number
  turnLimit?: number
  rules?: any
  createdAt: number
  updatedAt: number
  deletedAt?: number
  dirty?: boolean
}

export interface Game {
  id: string
  modelId?: string
  title?: string
  gameName: string
  status: 'IN_PROGRESS' | 'FINISHED' | 'ARCHIVED'
  scoreLimit?: number
  turnLimit?: number
  scoringMode: 'NORMAL' | 'INVERTED'
  showTurns: boolean
  showIntermediate: boolean
  startedAt: number
  finishedAt?: number
  winnerPlayerId?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  dirty?: boolean
}

export interface GamePlayer {
  id: string
  gameId: string
  playerId: string
  sortOrder: number
  createdAt: number
  updatedAt: number
  deletedAt?: number
  dirty?: boolean
}

export interface Turn {
  id: string
  gameId: string
  turnIndex: number
  currentPlayerId?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  dirty?: boolean
}

export interface TurnScore {
  id: string
  turnId: string
  playerId: string
  points: number
  createdAt: number
  updatedAt: number
  deletedAt?: number
  dirty?: boolean
}

export interface Settings {
  userId: string
  theme: 'system' | 'light' | 'dark'
  contrast: 'default' | 'medium' | 'high'
  showTurns: boolean
  showIntermediate: boolean
  updatedAt: number
}

export interface SyncOutbox {
  id?: number
  table: string
  recordId: string
  operation: 'upsert' | 'delete'
  payload: any
  createdAt: number
  retries: number
}

export interface SyncState {
  key: string
  lastPullAt?: number
  deviceId: string
  updatedAt: number
}

class ScoreCounterDB extends Dexie {
  players!: Table<Player>
  gameModels!: Table<GameModel>
  games!: Table<Game>
  gamePlayers!: Table<GamePlayer>
  turns!: Table<Turn>
  turnScores!: Table<TurnScore>
  settings!: Table<Settings>
  syncOutbox!: Table<SyncOutbox>
  syncState!: Table<SyncState>

  constructor() {
    super('ScoreCounterDB')

    this.version(1).stores({
      players: 'id, name, updatedAt, deletedAt',
      gameModels: 'id, name, updatedAt, deletedAt',
      games: 'id, status, modelId, startedAt, updatedAt, deletedAt',
      gamePlayers: 'id, gameId, playerId, updatedAt, deletedAt',
      turns: 'id, gameId, turnIndex, updatedAt, deletedAt',
      turnScores: 'id, [turnId+playerId], turnId, playerId, updatedAt, deletedAt',
      settings: 'userId',
      syncOutbox: '++id, table, recordId, createdAt',
      syncState: 'key'
    })
  }
}

export const db = new ScoreCounterDB()

// Helper to generate UUID v4
export function generateId(): string {
  return crypto.randomUUID()
}

// Helper to get current timestamp
export function now(): number {
  return Date.now()
}
