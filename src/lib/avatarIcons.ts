import type { LucideIcon } from 'lucide-react'
import {
  User,
  CircleUser,
  Smile,
  Heart,
  Star,
  Zap,
  Flame,
  Trophy,
  Crown,
  Rocket,
  Target,
  Diamond,
  Gamepad2,
  Dices,
  Clover,
  Coffee,
  Pizza,
  IceCream,
  Cat,
  Dog,
  Bird,
  Fish,
  Rabbit,
  Squirrel,
  Ghost,
} from 'lucide-react'

// Map explicite nom → composant : permet le tree-shaking de lucide-react
// (un `import * as Icons` embarquerait les ~1500 icônes dans le bundle)
export const AVATAR_ICON_MAP: Record<string, LucideIcon> = {
  'user': User,
  'user-circle': CircleUser,
  'smile': Smile,
  'heart': Heart,
  'star': Star,
  'zap': Zap,
  'flame': Flame,
  'trophy': Trophy,
  'crown': Crown,
  'rocket': Rocket,
  'target': Target,
  'diamond': Diamond,
  'ghost': Ghost,
  'gamepad-2': Gamepad2,
  'dices': Dices,
  'clover': Clover,
  'coffee': Coffee,
  'pizza': Pizza,
  'ice-cream': IceCream,
  'cat': Cat,
  'dog': Dog,
  'bird': Bird,
  'fish': Fish,
  'rabbit': Rabbit,
  'squirrel': Squirrel,
}

export const AVATAR_ICONS = Object.keys(AVATAR_ICON_MAP)

export type AvatarIconName = keyof typeof AVATAR_ICON_MAP

export function getAvatarIcon(name: string): LucideIcon | undefined {
  return AVATAR_ICON_MAP[name]
}
