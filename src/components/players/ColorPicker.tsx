import { PLAYER_COLORS } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PLAYER_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          className={cn(
            'h-10 w-10 rounded-full border-2 transition-all touch-manipulation relative',
            value === color.value ? 'border-foreground scale-110' : 'border-transparent'
          )}
          style={{ backgroundColor: color.value }}
          onClick={() => onChange(color.value)}
          aria-label={color.name}
        >
          {value === color.value && (
            <Check className="h-5 w-5 absolute inset-0 m-auto text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  )
}
