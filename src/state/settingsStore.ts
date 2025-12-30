import { db, type Settings, now } from '@/data/db'

const DEFAULT_SETTINGS: Settings = {
  userId: 'local',
  theme: 'dark',
  contrast: 'default',
  showTurns: true,
  showIntermediate: true,
  updatedAt: now()
}

class SettingsStore {
  private listeners: Set<() => void> = new Set()
  private cachedSettings: Settings | null = null

  async get(): Promise<Settings> {
    if (this.cachedSettings) {
      return this.cachedSettings
    }

    let settings = await db.settings.get('local')

    if (!settings) {
      settings = { ...DEFAULT_SETTINGS }
      await db.settings.put(settings)
    }

    this.cachedSettings = settings
    return settings
  }

  async update(partial: Partial<Omit<Settings, 'userId'>>): Promise<void> {
    const current = await this.get()
    const updated: Settings = {
      ...current,
      ...partial,
      updatedAt: now()
    }

    await db.settings.put(updated)
    this.cachedSettings = updated
    this.notifyListeners()
    this.applyTheme(updated)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }

  private applyTheme(settings: Settings) {
    const root = document.documentElement

    // Apply theme
    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', settings.theme)
    }

    // Apply contrast
    root.setAttribute('data-contrast', settings.contrast)
  }

  async init() {
    const settings = await this.get()
    this.applyTheme(settings)

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
      const current = await this.get()
      if (current.theme === 'system') {
        this.applyTheme(current)
      }
    })
  }
}

export const settingsStore = new SettingsStore()
