import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'
import { ActionMenu, type ActionMenuItem } from './action-menu.tsx'

/**
 * Contenedor de filas: una sola tarjeta con divisores, no una tarjeta por fila.
 * Sin `overflow-hidden`: recortaria el menu "⋯" de las filas.
 */
export function ListGroup({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'divide-y divide-line rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
      {...props}
    />
  )
}

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
 * Debe usarse como hijo directo de <ListGroup> (o de un <ul> con divisores).
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
  // Sin `onOpen` la fila es informativa: un div, no un boton deshabilitado.
  const bodyClass = cn(
    'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition',
    onOpen && 'active:bg-surface-subtle',
  )
  const content = (
    <>
      <span className="min-w-0 flex-1">
        {/* Descripciones importadas del banco pueden venir sin espacios. */}
        <span className="block text-sm font-medium text-ink [overflow-wrap:anywhere]">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted [overflow-wrap:anywhere]">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="shrink-0 text-right">{trailing}</span>}
    </>
  )

  return (
    <li className={cn('flex items-stretch', className)}>
      {onOpen ? (
        <button type="button" onClick={onOpen} className={bodyClass}>
          {content}
        </button>
      ) : (
        <div className={bodyClass}>{content}</div>
      )}

      {menu && menu.length > 0 && (
        <div className="flex items-center pr-1">
          <ActionMenu items={menu} label={menuLabel ?? 'Más acciones'} />
        </div>
      )}
    </li>
  )
}
