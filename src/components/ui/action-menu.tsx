import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils.ts'
import { Button } from './button.tsx'

export interface ActionMenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  /** Nombre accesible del botón "⋯" (por ejemplo, "Más acciones de Visa"). */
  label?: string
  className?: string
}

/**
 * Menú de acciones secundarias de una fila. El botón solo muestra "⋯" para
 * que las acciones destructivas no queden pegadas al dedo; se abre con toque
 * o teclado (Enter/Espacio, Escape cierra y devuelve el foco).
 */
export function ActionMenu({ items, label = 'Más acciones', className }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    firstItemRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className={cn('relative', className)}>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label={label}
            className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-menu"
          >
            {items.map((item, index) => (
              <button
                key={item.label}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-surface-subtle disabled:opacity-55',
                  item.tone === 'danger' ? 'text-danger' : 'text-ink-secondary',
                )}
              >
                {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
