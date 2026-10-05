import { Badge, type BadgeProps } from '../ui/badge.tsx'

const STATUS_MAP: Record<string, { label: string; tone: BadgeProps['tone'] }> = {
  ACTIVE: { label: 'Activa', tone: 'success' },
  INACTIVE: { label: 'Inactiva', tone: 'neutral' },
  OPEN: { label: 'Abierto', tone: 'info' },
  CLOSED: { label: 'Cerrado', tone: 'neutral' },
  PAID: { label: 'Pagado', tone: 'success' },
  PARTIALLY_PAID: { label: 'Parcial', tone: 'warning' },
  OVERDUE: { label: 'Vencido', tone: 'danger' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
  REVERSED: { label: 'Revertido', tone: 'neutral' },
  REFUNDED: { label: 'Devuelto', tone: 'info' },
  PENDING_VERIFICATION: { label: 'Sin verificar', tone: 'warning' },
  PENDING_DELETION: { label: 'En eliminación', tone: 'danger' },
  DELETED: { label: 'Eliminada', tone: 'neutral' },
}

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { label: status, tone: 'neutral' as const }
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}
