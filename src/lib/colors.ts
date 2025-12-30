export const PLAYER_COLORS = [
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Ambre', value: '#f59e0b' },
  { name: 'Jaune', value: '#eab308' },
  { name: 'Citron', value: '#84cc16' },
  { name: 'Vert', value: '#22c55e' },
  { name: 'Émeraude', value: '#10b981' },
  { name: 'Turquoise', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Bleu ciel', value: '#0ea5e9' },
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Pourpre', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Gris', value: '#6b7280' },
]

export function getContrastColor(hexColor: string): string {
  const rgb = parseInt(hexColor.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 140 ? '#000000' : '#ffffff'
}
