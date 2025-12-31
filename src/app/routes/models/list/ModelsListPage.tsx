import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { gameModelsRepository } from '@/data/repositories/gameModelsRepository'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Users, TrendingDown, TrendingUp, Trophy, Hash, Eye, EyeOff, Star } from 'lucide-react'

export function ModelsListPage() {
  const [showHidden, setShowHidden] = useState(false)
  const models = useLiveQuery(() => gameModelsRepository.getAll(showHidden), [showHidden])

  const handleToggleVisibility = async (e: React.MouseEvent, modelId: string, isCurrentlyHidden: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    if (isCurrentlyHidden) {
      await gameModelsRepository.show(modelId)
    } else {
      await gameModelsRepository.hide(modelId)
    }
  }

  if (!models) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  const visibleModels = models.filter(m => !m.isHidden)
  const hiddenModels = models.filter(m => m.isHidden)

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles de jeux</h1>
          <p className="text-sm text-muted-foreground">
            {visibleModels.length} {visibleModels.length > 1 ? 'modèles visibles' : 'modèle visible'}
            {hiddenModels.length > 0 && ` · ${hiddenModels.length} ${hiddenModels.length > 1 ? 'masqués' : 'masqué'}`}
          </p>
        </div>
        <div className="flex gap-2">
          {hiddenModels.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHidden(!showHidden)}
            >
              {showHidden ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showHidden ? 'Masquer cachés' : 'Voir cachés'}
            </Button>
          )}
          <Link to="/models/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau
            </Button>
          </Link>
        </div>
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
            <div key={model.id} className={`relative ${model.isHidden ? 'opacity-60' : ''}`}>
              <Link to="/models/$modelId" params={{ modelId: model.id }}>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        {model.isPredefined && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Star className="h-3 w-3" />
                            Prédéfini
                          </span>
                        )}
                        {model.isHidden && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            <EyeOff className="h-3 w-3" />
                            Masqué
                          </span>
                        )}
                      </div>
                      {model.isPredefined && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => handleToggleVisibility(e, model.id, model.isHidden || false)}
                        >
                          {model.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
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
                      {model.scoreLimit && (
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5" />
                          {model.scoreLimit} pts max
                        </span>
                      )}
                      {model.turnLimit && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5" />
                          {model.turnLimit} tours max
                        </span>
                      )}
                    </div>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
