import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-subtle px-6 py-10 text-center">
      {icon && <div className="mb-2 text-ink-muted">{icon}</div>}
      <p className="text-sm font-medium text-ink-secondary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
