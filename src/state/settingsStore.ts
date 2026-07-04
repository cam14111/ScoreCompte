export type ThemePreference = 'system' | 'light' | 'dark'

// NB : la clé et la logique de résolution sont dupliquées dans le script
// inline anti-flash de index.html — garder les deux synchronisés.
const THEME_KEY = 'app_theme'

// Couleur de la barre système (PWA) pour chaque thème résolu
// (le "dark" doit correspondre au <meta name="theme-color"> de index.html)
const THEME_COLORS: Record<'light' | 'dark', string> = {
  dark: '#1e293b',
  light: '#f8fafc',
}

class SettingsStore {
  private theme: ThemePreference = 'dark'
  private mediaQuery: MediaQueryList | null = null

  getTheme(): ThemePreference {
    return this.theme
  }

  setTheme(theme: ThemePreference) {
    this.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Stockage indisponible (mode privé) : le thème reste appliqué pour la session
    }
    this.applyTheme()
  }

  private resolveTheme(): 'light' | 'dark' {
    if (this.theme === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark'
    }
    return this.theme
  }

  private applyTheme() {
    const resolved = this.resolveTheme()
    document.documentElement.setAttribute('data-theme', resolved)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', THEME_COLORS[resolved])
    }
  }

  init() {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        this.theme = saved
      }
    } catch {
      // Stockage indisponible : thème par défaut
    }

    // Suivre le thème système en temps réel quand le mode "system" est actif
    this.mediaQuery = window.matchMedia?.('(prefers-color-scheme: light)') ?? null
    this.mediaQuery?.addEventListener?.('change', () => {
      if (this.theme === 'system') {
        this.applyTheme()
      }
    })

    this.applyTheme()
  }
}

export const settingsStore = new SettingsStore()
