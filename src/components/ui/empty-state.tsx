import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  /** Acción sugerida: un vacío sin salida es un callejón. */
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-subtle px-6 py-10 text-center">
      {icon && <div className="mb-3 text-ink-muted">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center [&>*]:w-auto">{action}</div>}
    </div>
  )
}
