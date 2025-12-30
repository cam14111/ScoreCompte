import { Link } from '@tanstack/react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Trophy, Users, FileText } from 'lucide-react'

export function HomePage() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Bienvenue</h1>
        <p className="text-muted-foreground">
          Gérez vos parties de jeux de société facilement
        </p>
      </div>

      <div className="grid gap-4">
        <Link to="/games">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Parties</CardTitle>
                  <CardDescription>Créer et gérer vos parties</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/players">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Joueurs</CardTitle>
                  <CardDescription>Gérer vos joueurs</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/models">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Modèles</CardTitle>
                  <CardDescription>Modèles de jeux prédéfinis</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
