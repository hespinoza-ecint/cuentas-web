import { useState } from 'react'
import { TextareaField } from './TextareaField.tsx'
import { Button } from '../ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/dialog.tsx'
import { SubmitButton } from '../ui/submit-button.tsx'

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  /** Tono del botón principal: peligro para acciones destructivas. */
  tone?: 'danger' | 'primary'
  pending?: boolean
  onSubmit: (reason: string) => Promise<void> | void
}

/** Diálogo para acciones que exigen motivo (reversos, cancelaciones, reinicios). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  tone = 'danger',
  pending = false,
  onSubmit,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    const value = reason.trim()
    if (value.length < 3) {
      setError('Escribe el motivo (mínimo 3 caracteres).')
      return
    }
    setError(null)
    void Promise.resolve(onSubmit(value)).then(() => setReason(''))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
          noValidate
        >
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          <div className="mt-4">
            <TextareaField
              label="Motivo"
              hint="Queda registrado junto con el cambio."
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              error={error ?? undefined}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <SubmitButton pending={pending} variant={tone} pendingLabel="Procesando…">
              {confirmLabel}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
