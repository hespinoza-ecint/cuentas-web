import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Download, LogIn, RotateCcw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { clearSession, setSessionUser } from '../../lib/auth/session.ts'
import { useSessionUser } from '../auth/use-session.ts'
import { cancelDeletion, exportAccountData } from '../users/users-api.ts'
import { DeleteAccountDialog } from './DeleteAccountDialog.tsx'
import { ResetDataDialog } from './ResetDataDialog.tsx'

export function AccountPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useSessionUser()
  const [notice, setNotice] = useState<string | null>(null)
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetCardsOpen, setResetCardsOpen] = useState(false)

  const handleResetDone = (message: string) => {
    setNotice(message)
    void queryClient.invalidateQueries()
  }

  const exportMutation = useMutation({
    mutationFn: exportAccountData,
    onSuccess: ({ data, filename }) => {
      downloadJson(data, filename)
      setNotice('Exportación descargada.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelDeletion,
    onSuccess: (message) => {
      if (user) {
        setSessionUser({ ...user, status: 'ACTIVE' })
      }
      setNotice(message)
    },
  })

  const pendingDeletion = user?.status === 'PENDING_DELETION'

  if (deletedMessage) {
    return (
      <div data-testid="account-page">
        <PageHeader title="Cuenta y datos" />
        <Card>
          <CardTitle>Eliminación programada</CardTitle>
          <CardDescription>{deletedMessage}</CardDescription>
          <p className="mt-3 text-sm text-ink-secondary">
            Para cancelar la eliminación, inicia sesión de nuevo con tu correo y contraseña.
          </p>
          <div className="mt-4">
            <Button
              onClick={() => {
                clearSession()
                void navigate('/login', { replace: true })
              }}
            >
              <LogIn className="size-4" aria-hidden="true" />
              Ir a iniciar sesión
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="account-page">
      <PageHeader
        title="Cuenta y datos"
        description="Exporta tu información, restablece tus datos o elimina tu cuenta cuando ya no la uses"
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={exportMutation.error ?? cancelMutation.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

      <div className="space-y-4">
        <Card>
          <CardTitle>Estado de la cuenta</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-secondary">
            <StatusBadge status={user?.status ?? 'ACTIVE'} />
            {pendingDeletion
              ? 'Tu cuenta se eliminará en los próximos 30 días.'
              : 'Tu cuenta está activa.'}
          </p>

          {pendingDeletion && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={cancelMutation.isPending}
                onClick={() => {
                  setNotice(null)
                  cancelMutation.mutate()
                }}
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Cancelar eliminación'}
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Exportar datos</CardTitle>
          <CardDescription>
            Descarga un archivo JSON con tu perfil, configuración y registros financieros.
          </CardDescription>
          <div className="mt-4">
            <Button
              variant="secondary"
              disabled={exportMutation.isPending}
              onClick={() => {
                setNotice(null)
                exportMutation.mutate()
              }}
            >
              <Download className="size-4" aria-hidden="true" />
              {exportMutation.isPending ? 'Preparando…' : 'Descargar exportación'}
            </Button>
          </div>
        </Card>

        {!pendingDeletion && (
          <Card>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-warning" aria-hidden="true" />
              Restablecer tarjetas
            </CardTitle>
            <CardDescription>
              Borra tarjetas, libro, estados de cuenta, pagos, compras, planes y mensualidades. Tu
              efectivo, ingresos, gastos y recurrentes se conservan.
            </CardDescription>
            <div className="mt-4">
              <Button variant="danger" onClick={() => setResetCardsOpen(true)}>
                Restablecer tarjetas
              </Button>
            </div>
          </Card>
        )}

        {!pendingDeletion && (
          <Card>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4 text-warning" aria-hidden="true" />
              Restablecer datos
            </CardTitle>
            <CardDescription>
              Borra todo el historial financiero: cuentas y movimientos, ingresos, gastos,
              recurrentes, tarjetas, cortes, pagos, compras, mensualidades, recomendaciones y
              categorías propias. Tu cuenta, sesión y preferencias se conservan. Para borrar solo
              tarjetas usa la opción anterior. Descarga tu exportación antes si quieres un respaldo.
            </CardDescription>
            <div className="mt-4">
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                Restablecer datos
              </Button>
            </div>
          </Card>
        )}

        {!pendingDeletion && (
          <Card>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-danger" aria-hidden="true" />
              Eliminar cuenta
            </CardTitle>
            <CardDescription>
              La cuenta se desactiva de inmediato y se elimina definitivamente a los 30 días. Puedes
              cancelar iniciando sesión de nuevo.
            </CardDescription>
            <div className="mt-4">
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Eliminar mi cuenta
              </Button>
            </div>
          </Card>
        )}
      </div>

      {resetCardsOpen && (
        <ResetDataDialog
          open
          scope="CARDS"
          onOpenChange={setResetCardsOpen}
          onReset={handleResetDone}
        />
      )}

      {resetOpen && (
        <ResetDataDialog
          open
          onOpenChange={setResetOpen}
          onReset={handleResetDone}
        />
      )}

      {deleteOpen && (
        <DeleteAccountDialog
          open
          onOpenChange={setDeleteOpen}
          onDeleted={(message) => setDeletedMessage(message)}
        />
      )}
    </div>
  )
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
