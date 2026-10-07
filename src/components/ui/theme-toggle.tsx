import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme.ts'
import { Button } from './button.tsx'

/** Alterna claro/oscuro; el modo "sistema" se elige en la hoja "Más". */
export function ThemeToggle() {
  const { effective, toggle } = useTheme()
  const dark = effective === 'dark'
  const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-2"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {/* El icono anuncia la acción (luna si vas a oscuro, sol si vas a claro). */}
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  )
}
