import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'
import { ActionMenu, type ActionMenuItem } from './action-menu.tsx'

interface ListRowProps {
  /** Tocar la fila abre el detalle. Sin esto la fila es solo informativa. */
  onOpen?: () => void
  title: ReactNode
  subtitle?: ReactNode
  /** Monto o estado a la derecha (se mantiene visible sin abrir el detalle). */
  trailing?: ReactNode
  menu?: ActionMenuItem[]
  menuLabel?: string
  className?: string
}

/**
 * Fila de lista tocable: el dedo va a la fila completa, no a un botón
 * pequeño. Las acciones secundarias (editar, eliminar…) viven en el menú "⋯".
 * Debe usarse como hijo directo de <ul>.
 */
export function ListRow({
  onOpen,
  title,
  subtitle,
  trailing,
  menu,
  menuLabel,
  className,
}: ListRowProps) {
  return (
    <li
      className={cn(
        'flex items-stretch rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition',
          onOpen && 'active:bg-surface-subtle',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
              {subtitle}
            </span>
          )}
        </span>
        {trailing && <span className="shrink-0 text-right">{trailing}</span>}
      </button>

      {menu && menu.length > 0 && (
        <div className="flex items-center pr-2">
          <ActionMenu items={menu} label={menuLabel ?? 'Más acciones'} />
        </div>
      )}
    </li>
  )
}
