import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'
import { Badge } from './badge.tsx'
import { Card } from './card.tsx'

interface FiltersCardProps {
  /** Número de filtros activos (se muestra como contador en el botón). */
  activeCount: number
  children: ReactNode
}

/**
 * Tarjeta de filtros: en móvil se pliega tras un botón "Filtros"; desde el
 * breakpoint sm se muestra siempre, como antes.
 */
export function FiltersCard({ activeCount, children }: FiltersCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="mb-4 p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-sm font-medium text-ink-secondary sm:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtros
          {activeCount > 0 && <Badge tone="info">{activeCount}</Badge>}
        </span>
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <div className={cn(open ? 'mt-3 sm:mt-0' : 'hidden sm:block')}>{children}</div>
    </Card>
  )
}
