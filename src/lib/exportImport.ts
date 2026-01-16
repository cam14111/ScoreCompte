import { db } from '@/data/db'

export interface ExportData {
  version: string
  exportedAt: number
  players: any[]
  gameModels: any[]
  games: any[]
  gamePlayers: any[]
  turns: any[]
  turnScores: any[]
}

export const exportToJSON = async (
  options: {
    includeInProgress?: boolean
    includeFinished?: boolean
    includePlayers?: boolean
    includeModels?: boolean
  } = {}
): Promise<ExportData> => {
  const {
    includeInProgress = true,
    includeFinished = true,
    includePlayers = true,
    includeModels = true
  } = options

  const data: ExportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    players: [],
    gameModels: [],
    games: [],
    gamePlayers: [],
    turns: [],
    turnScores: []
  }

  // Export players
  if (includePlayers) {
    data.players = await db.players
      .filter(p => !p.deletedAt)
      .toArray()
  }

  // Export game models
  if (includeModels) {
    data.gameModels = await db.gameModels
      .filter(m => !m.deletedAt)
      .toArray()
  }

  // Export games based on filters
  const games = await db.games
    .filter(g => {
      if (g.deletedAt) return false
      if (!includeInProgress && g.status === 'IN_PROGRESS') return false
      if (!includeFinished && g.status === 'FINISHED') return false
      return true
    })
    .toArray()

  data.games = games

  // Export related data for selected games
  const gameIds = games.map(g => g.id)

  if (gameIds.length > 0) {
    data.gamePlayers = await db.gamePlayers
      .where('gameId')
      .anyOf(gameIds)
      .filter(gp => !gp.deletedAt)
      .toArray()

    data.turns = await db.turns
      .where('gameId')
      .anyOf(gameIds)
      .filter(t => !t.deletedAt)
      .toArray()

    const turnIds = data.turns.map(t => t.id)
    if (turnIds.length > 0) {
      data.turnScores = await db.turnScores
        .where('turnId')
        .anyOf(turnIds)
        .filter(ts => !ts.deletedAt)
        .toArray()
    }
  }

  return data
}

export const downloadJSON = (data: ExportData, filename?: string) => {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `score-counter-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportToCSV = async (): Promise<string> => {
  const games = await db.games.filter(g => !g.deletedAt && g.status === 'FINISHED').toArray()

  const rows: string[][] = [
    ['Date', 'Jeu', 'Titre', 'Joueur', 'Score', 'Classement', 'Victoire']
  ]

  for (const game of games) {
    const gamePlayers = await db.gamePlayers
      .where('gameId')
      .equals(game.id)
      .filter(gp => !gp.deletedAt)
      .toArray()

    const totals: Record<string, number> = {}
    const turns = await db.turns.where('gameId').equals(game.id).filter(t => !t.deletedAt).toArray()

    for (const turn of turns) {
      const scores = await db.turnScores.where('turnId').equals(turn.id).filter(ts => !ts.deletedAt).toArray()
      for (const score of scores) {
        totals[score.playerId] = (totals[score.playerId] || 0) + score.points
      }
    }

    const playerScores = await Promise.all(
      gamePlayers.map(async gp => {
        const player = await db.players.get(gp.playerId)
        return {
          name: player?.name || 'Unknown',
          score: totals[gp.playerId] || 0
        }
      })
    )

    const sorted = game.scoringMode === 'INVERTED'
      ? playerScores.sort((a, b) => a.score - b.score)
      : playerScores.sort((a, b) => b.score - a.score)

    const date = new Date(game.finishedAt || game.startedAt).toLocaleDateString('fr-FR')

    sorted.forEach((ps, index) => {
      const rank = index + 1
      const isWinner = rank === 1
      rows.push([
        date,
        game.gameName,
        game.title || '',
        ps.name,
        ps.score.toString(),
        rank.toString(),
        isWinner ? 'Oui' : 'Non'
      ])
    })
  }

  return rows.map(row => row.map(cell => `"${cell}"`).join(';')).join('\n')
}

export const downloadCSV = (csv: string, filename?: string) => {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `score-counter-export-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const importFromJSON = async (
  data: ExportData,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ success: boolean; message: string }> => {
  try {
    if (mode === 'replace') {
      // Clear all data first
      await db.transaction('rw', [
        db.players,
        db.gameModels,
        db.games,
        db.gamePlayers,
        db.turns,
        db.turnScores
      ], async () => {
        await db.players.clear()
        await db.gameModels.clear()
        await db.games.clear()
        await db.gamePlayers.clear()
        await db.turns.clear()
        await db.turnScores.clear()
      })
    }

    await db.transaction('rw', [
      db.players,
      db.gameModels,
      db.games,
      db.gamePlayers,
      db.turns,
      db.turnScores
    ], async () => {
      // Import players
      for (const player of data.players || []) {
        const existing = await db.players.get(player.id)
        if (!existing || mode === 'replace') {
          // Remove dirty field if it exists in imported data
          const { dirty, ...cleanPlayer } = player
          await db.players.put(cleanPlayer)
        }
      }

      // Import game models
      for (const model of data.gameModels || []) {
        const existing = await db.gameModels.get(model.id)
        if (!existing || mode === 'replace') {
          const { dirty, ...cleanModel } = model
          await db.gameModels.put(cleanModel)
        }
      }

      // Import games
      for (const game of data.games || []) {
        const existing = await db.games.get(game.id)
        if (!existing || mode === 'replace') {
          const { dirty, ...cleanGame } = game
          await db.games.put(cleanGame)
        }
      }

      // Import game players
      for (const gp of data.gamePlayers || []) {
        const existing = await db.gamePlayers.get(gp.id)
        if (!existing || mode === 'replace') {
          const { dirty, ...cleanGp } = gp
          await db.gamePlayers.put(cleanGp)
        }
      }

      // Import turns
      for (const turn of data.turns || []) {
        const existing = await db.turns.get(turn.id)
        if (!existing || mode === 'replace') {
          const { dirty, ...cleanTurn } = turn
          await db.turns.put(cleanTurn)
        }
      }

      // Import turn scores
      for (const score of data.turnScores || []) {
        const existing = await db.turnScores.get(score.id)
        if (!existing || mode === 'replace') {
          const { dirty, ...cleanScore } = score
          await db.turnScores.put(cleanScore)
        }
      }
    })

    const stats = {
      players: data.players?.length || 0,
      models: data.gameModels?.length || 0,
      games: data.games?.length || 0
    }

    return {
      success: true,
      message: `Import réussi : ${stats.players} joueurs, ${stats.models} modèles, ${stats.games} parties`
    }
  } catch (error) {
    console.error('Import error:', error)
    return {
      success: false,
      message: `Erreur lors de l'import : ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
