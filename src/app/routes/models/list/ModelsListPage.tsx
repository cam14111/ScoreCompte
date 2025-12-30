import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { gameModelsRepository } from '@/data/repositories/gameModelsRepository'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Users, TrendingDown, TrendingUp, RotateCw, User } from 'lucide-react'

export function ModelsListPage() {
  const models = useLiveQuery(() => gameModelsRepository.getAll(), [])

  if (!models) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles de jeux</h1>
          <p className="text-sm text-muted-foreground">
            {models.length} {models.length > 1 ? 'modèles' : 'modèle'}
          </p>
        </div>
        <Link to="/models/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        </Link>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Aucun modèle de jeu</p>
          <Link to="/models/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier modèle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <Link key={model.id} to="/models/$modelId" params={{ modelId: model.id }}>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
                <CardHeader>
                  <CardTitle className="text-lg">{model.name}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {model.minPlayers === model.maxPlayers
                          ? `${model.minPlayers} joueurs`
                          : `${model.minPlayers}-${model.maxPlayers} joueurs`}
                      </span>
                      <span className="flex items-center gap-1">
                        {model.scoringMode === 'INVERTED' ? (
                          <>
                            <TrendingDown className="h-3.5 w-3.5" />
                            Score inversé
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-3.5 w-3.5" />
                            Score normal
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        {model.entryMode === 'TURN_BY_PLAYER' ? (
                          <>
                            <User className="h-3.5 w-3.5" />
                            Tour par joueur
                          </>
                        ) : (
                          <>
                            <RotateCw className="h-3.5 w-3.5" />
                            Tous les joueurs
                          </>
                        )}
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
