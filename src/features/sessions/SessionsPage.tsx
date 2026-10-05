import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MonitorSmartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { clearSession } from '../../lib/auth/session.ts'
import { formatDateTime } from '../../lib/dates.ts'
import { listSessions, logoutAll, revokeSession, type UserSession } from './sessions-api.ts'

export function SessionsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [toRevoke, setToRevoke] = useState<UserSession | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  const sessions = useQuery({ queryKey: ['sessions'], queryFn: listSessions })

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })

  const revokeAll = useMutation({
    mutationFn: logoutAll,
    onSuccess: () => {
      clearSession()
      void navigate('/login', { replace: true })
    },
  })

  return (
    <div data-testid="sessions-page">
      <PageHeader
        title="Sesiones activas"
        description="Dispositivos con acceso a tu cuenta"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmLogoutAll(true)}
            disabled={revokeAll.isPending}
          >
            Cerrar todas
          </Button>
        }
      />

      <ErrorAlert error={revoke.error ?? revokeAll.error} className="mb-4" />

      {sessions.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {sessions.isError && (
        <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
      )}

      {sessions.data &&
        (sessions.data.length === 0 ? (
          <EmptyState title="Sin sesiones activas" icon={<MonitorSmartphone className="size-6" />} />
        ) : (
          <ul className="space-y-3" data-testid="sessions-list">
            {sessions.data.map((session) => (
              <li key={session.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <MonitorSmartphone className="size-4 text-slate-400" aria-hidden="true" />
                      {session.deviceName ?? session.userAgent ?? 'Dispositivo desconocido'}
                      {session.current && <Badge tone="info">Actual</Badge>}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {session.ip ? `${session.ip} · ` : ''}
                      Creada {formatDateTime(session.createdAt)} · Último uso{' '}
                      {formatDateTime(session.lastUsedAt)}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setToRevoke(session)}
                      disabled={revoke.isPending}
                    >
                      Revocar
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        ))}

      <ConfirmDialog
        open={toRevoke !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToRevoke(null)
          }
        }}
        title="Revocar sesión"
        description="El dispositivo perderá el acceso a tu cuenta de inmediato."
        confirmLabel="Revocar"
        onConfirm={async () => {
          if (toRevoke) {
            await revoke.mutateAsync(toRevoke.id)
          }
        }}
      />

      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Cerrar todas las sesiones"
        description="Se cerrará tu sesión en todos los dispositivos, incluido este."
        confirmLabel="Cerrar todas"
        onConfirm={async () => {
          await revokeAll.mutateAsync()
        }}
      />
    </div>
  )
}
