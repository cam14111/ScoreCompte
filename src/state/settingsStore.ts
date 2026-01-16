import type { Settings } from '@/data/db'

const DEFAULT_SETTINGS: Settings = {
  userId: 'local',
  theme: 'dark',
  contrast: 'default',
  showTurns: true,
  showIntermediate: true,
  updatedAt: Date.now()
}

class SettingsStore {
  get(): Settings {
    return { ...DEFAULT_SETTINGS }
  }

  private applyTheme() {
    const root = document.documentElement

    // Apply default dark theme
    root.setAttribute('data-theme', 'dark')

    // Apply default contrast
    root.setAttribute('data-contrast', 'default')
  }

  init() {
    this.applyTheme()
  }
}

export const settingsStore = new SettingsStore()
