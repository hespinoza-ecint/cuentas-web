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
  const menuRef = useRef<HTMLDivElement>(null)
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
        return
      }
      // El foco no debe irse al contenido que queda detras del velo.
      if (event.key === 'Tab') {
        setOpen(false)
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        return
      }
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
          [],
      )
      if (items.length === 0) {
        return
      }
      event.preventDefault()
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const index =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? (current + 1) % items.length
              : (current - 1 + items.length) % items.length
      items[index]?.focus()
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
        // Movil: objetivo tactil de 44px (va pegado a una fila que tambien es boton).
        className="size-11 sm:size-8"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </Button>

      {open && (
        <>
          {/*
           * Movil: el menu se ancla abajo como hoja de acciones (con velo), para
           * que el de las ultimas filas no quede bajo la barra inferior.
           * Escritorio: desplegable junto al boton, como siempre.
           */}
          <div
            className="fixed inset-0 z-40 max-sm:z-50 max-sm:animate-[fade-in_150ms_ease-out] max-sm:bg-overlay/60"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className={cn(
              'absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-menu',
              'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:mt-0 max-sm:w-auto max-sm:animate-[sheet-in_200ms_ease-out] max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:px-2 max-sm:pt-2 max-sm:shadow-sheet',
              'max-sm:[padding-bottom:calc(0.5rem+env(safe-area-inset-bottom,0px))]',
            )}
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
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-surface-subtle active:bg-surface-subtle disabled:opacity-55 max-sm:min-h-12 max-sm:rounded-lg max-sm:text-base',
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
