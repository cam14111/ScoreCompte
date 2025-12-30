import { Menu } from 'lucide-react'
import { useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation()

  const getTitle = () => {
    if (location.pathname === '/') return 'Score Counter'
    if (location.pathname === '/games') return 'Parties'
    if (location.pathname.startsWith('/games/') && location.pathname.endsWith('/results')) return 'Résultats'
    if (location.pathname.startsWith('/games/new')) return 'Nouvelle partie'
    if (location.pathname.startsWith('/games/')) return 'Partie en cours'
    if (location.pathname === '/players') return 'Joueurs'
    if (location.pathname.startsWith('/players/new')) return 'Nouveau joueur'
    if (location.pathname.startsWith('/players/')) return 'Modifier joueur'
    if (location.pathname === '/models') return 'Modèles de jeux'
    if (location.pathname.startsWith('/models/new')) return 'Nouveau modèle'
    if (location.pathname.startsWith('/models/')) return 'Modifier modèle'
    if (location.pathname === '/settings') return 'Paramètres'
    if (location.pathname === '/import-export') return 'Import/Export'
    if (location.pathname === '/backup') return 'Sauvegarde'
    return 'Score Counter'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm safe-top">
      <div className="flex h-14 items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-2 touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-semibold">{getTitle()}</h1>
      </div>
    </header>
  )
}
