import { lazy, Suspense } from 'react'
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { AppShell } from './layout/AppShell'
import { HomePage } from './routes/home/HomePage'

// Lazy-loaded route components for code splitting
const GamesListPage = lazy(() => import('./routes/games/list/GamesListPage').then(m => ({ default: m.GamesListPage })))
const GameCreatePage = lazy(() => import('./routes/games/create/GameCreatePage').then(m => ({ default: m.GameCreatePage })))
const GameDetailPage = lazy(() => import('./routes/games/detail/GameDetailPage').then(m => ({ default: m.GameDetailPage })))
const GameResultsPage = lazy(() => import('./routes/games/results/GameResultsPage').then(m => ({ default: m.GameResultsPage })))
const PlayersListPage = lazy(() => import('./routes/players/list/PlayersListPage').then(m => ({ default: m.PlayersListPage })))
const PlayerCreatePage = lazy(() => import('./routes/players/create/PlayerCreatePage').then(m => ({ default: m.PlayerCreatePage })))
const PlayerEditPage = lazy(() => import('./routes/players/edit/PlayerEditPage').then(m => ({ default: m.PlayerEditPage })))
const PlayerStatsPage = lazy(() => import('./routes/players/stats/PlayerStatsPage').then(m => ({ default: m.PlayerStatsPage })))
const ModelsListPage = lazy(() => import('./routes/models/list/ModelsListPage').then(m => ({ default: m.ModelsListPage })))
const ModelCreatePage = lazy(() => import('./routes/models/create/ModelCreatePage').then(m => ({ default: m.ModelCreatePage })))
const ModelEditPage = lazy(() => import('./routes/models/edit/ModelEditPage').then(m => ({ default: m.ModelEditPage })))
const ImportExportPage = lazy(() => import('./routes/import-export/ImportExportPage').then(m => ({ default: m.ImportExportPage })))

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Chargement...</span>
      </div>
    </div>
  </div>
)

// Wrapper to add Suspense around lazy components
const withSuspense = (Component: React.ComponentType) => {
  return () => (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  )
}

const rootRoute = createRootRoute({
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage, // Keep home page eager-loaded for initial performance
})

const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  component: withSuspense(GamesListPage),
})

const gameCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/new',
  component: withSuspense(GameCreatePage),
})

const gameDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$gameId',
  component: withSuspense(GameDetailPage),
})

const gameResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$gameId/results',
  component: withSuspense(GameResultsPage),
})

const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: withSuspense(PlayersListPage),
})

const playerCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/new',
  component: withSuspense(PlayerCreatePage),
})

const playerEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/$playerId',
  component: withSuspense(PlayerEditPage),
})

const playerStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/$playerId/stats',
  component: withSuspense(PlayerStatsPage),
})

const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/models',
  component: withSuspense(ModelsListPage),
})

const modelCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/models/new',
  component: withSuspense(ModelCreatePage),
})

const modelEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/models/$modelId',
  component: withSuspense(ModelEditPage),
})

const importExportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import-export',
  component: withSuspense(ImportExportPage),
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
  playerStatsRoute,
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
