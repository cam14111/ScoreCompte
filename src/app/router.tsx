import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { AppShell } from './layout/AppShell'
import { HomePage } from './routes/home/HomePage'
import { GamesListPage } from './routes/games/list/GamesListPage'
import { GameCreatePage } from './routes/games/create/GameCreatePage'
import { GameDetailPage } from './routes/games/detail/GameDetailPage'
import { GameResultsPage } from './routes/games/results/GameResultsPage'
import { PlayersListPage } from './routes/players/list/PlayersListPage'
import { PlayerCreatePage } from './routes/players/create/PlayerCreatePage'
import { PlayerEditPage } from './routes/players/edit/PlayerEditPage'
import { ModelsListPage } from './routes/models/list/ModelsListPage'
import { ModelCreatePage } from './routes/models/create/ModelCreatePage'
import { ModelEditPage } from './routes/models/edit/ModelEditPage'
import { ImportExportPage } from './routes/import-export/ImportExportPage'

const rootRoute = createRootRoute({
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  component: GamesListPage,
})

const gameCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/new',
  component: GameCreatePage,
})

const gameDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$gameId',
  component: GameDetailPage,
})

const gameResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$gameId/results',
  component: GameResultsPage,
})

const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersListPage,
})

const playerCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/new',
  component: PlayerCreatePage,
})

const playerEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/$playerId',
  component: PlayerEditPage,
})

const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/models',
  component: ModelsListPage,
})

const modelCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/models/new',
  component: ModelCreatePage,
})

const modelEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/models/$modelId',
  component: ModelEditPage,
})

const importExportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import-export',
  component: ImportExportPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  gamesRoute,
  gameCreateRoute,
  gameDetailRoute,
  gameResultsRoute,
  playersRoute,
  playerCreateRoute,
  playerEditRoute,
  modelsRoute,
  modelCreateRoute,
  modelEditRoute,
  importExportRoute,
])

export const router = createRouter({
  routeTree,
  basepath: '/ScoreCompte',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
