import { Link } from '@tanstack/react-router'
import { Home, Trophy, Users, FileText, Download, Cloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import packageJson from '../../../package.json'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Drawer({ open, onOpenChange }: DrawerProps) {
  const menuItems = [
    { icon: Home, label: 'Accueil', to: '/' },
    { icon: Trophy, label: 'Parties', to: '/games' },
    { icon: Users, label: 'Joueurs', to: '/players' },
    { icon: FileText, label: 'Modèles de jeux', to: '/models' },
    { icon: Download, label: 'Import/Export', to: '/import-export' },
    { icon: Cloud, label: 'Sauvegarde', to: '/backup' },
  ]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-card border-r shadow-lg transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b px-4 safe-top">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground touch-manipulation no-tap-highlight"
                      activeProps={{
                        className: 'bg-accent text-accent-foreground'
                      }}
                      onClick={() => onOpenChange(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t p-4 safe-bottom">
            <p className="text-xs text-muted-foreground text-center">
              Score Counter v{packageJson.version}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
