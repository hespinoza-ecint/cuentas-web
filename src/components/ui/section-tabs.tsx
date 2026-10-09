import { NavLink } from 'react-router'
import { cn } from '../../lib/utils.ts'

interface SectionTab {
  to: string
  label: string
  end?: boolean
}

interface SectionTabsProps {
  /** Nombre accesible del grupo (por ejemplo, "Secciones de Movimientos"). */
  label: string
  tabs: SectionTab[]
}

/**
 * Pestañas de sección dentro de un módulo (Movimientos, Tarjetas). Se
 * desplazan en horizontal cuando no caben y marcan la activa con color y
 * subrayado (nunca solo con color).
 */
export function SectionTabs({ label, tabs }: SectionTabsProps) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              '-mb-px flex h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition',
              isActive
                ? 'border-brand text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
