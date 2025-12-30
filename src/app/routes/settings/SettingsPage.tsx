import { useEffect, useState } from 'react'
import { settingsStore } from '@/state/settingsStore'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Settings as SettingsType } from '@/data/db'

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null)

  useEffect(() => {
    loadSettings()
    const unsubscribe = settingsStore.subscribe(() => {
      loadSettings()
    })
    return unsubscribe
  }, [])

  const loadSettings = async () => {
    const s = await settingsStore.get()
    setSettings(s)
  }

  const handleThemeChange = async (theme: 'system' | 'light' | 'dark') => {
    await settingsStore.update({ theme })
  }

  const handleContrastChange = async (contrast: 'default' | 'medium' | 'high') => {
    await settingsStore.update({ contrast })
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-4">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Personnalisez l'affichage de l'application
        </p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Thème</CardTitle>
          <CardDescription>Choisissez l'apparence de l'application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            className={`w-full p-4 border rounded-lg text-left transition-colors touch-manipulation ${
              settings.theme === 'system' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleThemeChange('system')}
          >
            <Label className="cursor-pointer">
              <div className="font-medium">Système</div>
              <div className="text-sm text-muted-foreground">
                Utilise les paramètres de votre appareil
              </div>
            </Label>
          </button>

          <button
            className={`w-full p-4 border rounded-lg text-left transition-colors touch-manipulation ${
              settings.theme === 'dark' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleThemeChange('dark')}
          >
            <Label className="cursor-pointer">
              <div className="font-medium">Sombre</div>
              <div className="text-sm text-muted-foreground">
                Thème sombre pour réduire la fatigue visuelle
              </div>
            </Label>
          </button>

          <button
            className={`w-full p-4 border rounded-lg text-left transition-colors touch-manipulation ${
              settings.theme === 'light' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleThemeChange('light')}
          >
            <Label className="cursor-pointer">
              <div className="font-medium">Clair</div>
              <div className="text-sm text-muted-foreground">
                Thème clair pour une meilleure visibilité en extérieur
              </div>
            </Label>
          </button>
        </CardContent>
      </Card>

      {/* Contrast */}
      <Card>
        <CardHeader>
          <CardTitle>Contraste</CardTitle>
          <CardDescription>Ajustez le niveau de contraste pour améliorer la lisibilité</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            className={`w-full p-4 border rounded-lg text-left transition-colors touch-manipulation ${
              settings.contrast === 'default' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleContrastChange('default')}
          >
            <Label className="cursor-pointer">
              <div className="font-medium">Par défaut</div>
              <div className="text-sm text-muted-foreground">Contraste standard</div>
            </Label>
          </button>

          <button
            className={`w-full p-4 border rounded-lg text-left transition-colors touch-manipulation ${
              settings.contrast === 'medium' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleContrastChange('medium')}
          >
            <Label className="cursor-pointer">
              <div className="font-medium">Moyen</div>
              <div className="text-sm text-muted-foreground">Contraste légèrement augmenté</div>
            </Label>
          </button>

          <button
            className={`w-full p-4 border rounded-lg text-left transition-colors touch-manipulation ${
              settings.contrast === 'high' ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
            }`}
            onClick={() => handleContrastChange('high')}
          >
            <Label className="cursor-pointer">
              <div className="font-medium">Élevé</div>
              <div className="text-sm text-muted-foreground">Contraste maximum pour une meilleure accessibilité</div>
            </Label>
          </button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>À propos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Score Counter v1.0.0</p>
          <p>PWA de comptage de scores pour jeux de société</p>
          <p className="pt-2">Fonctionne 100% hors-ligne grâce à IndexedDB</p>
        </CardContent>
      </Card>
    </div>
  )
}
