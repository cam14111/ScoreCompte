import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { TopBar } from './TopBar'
import { Drawer } from './Drawer'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const showFAB = location.pathname === '/' || location.pathname === '/games'

  const handleFABClick = () => {
    if (location.pathname === '/games' || location.pathname === '/') {
      navigate({ to: '/games/new' })
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar onMenuClick={() => setDrawerOpen(true)} />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      <main className="flex-1 overflow-y-auto safe-bottom">
        <Outlet />
      </main>

      {showFAB && (
        <button
          onClick={handleFABClick}
          className={cn(
            'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 touch-manipulation no-tap-highlight',
            'flex items-center justify-center'
          )}
          aria-label="Create new game"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
