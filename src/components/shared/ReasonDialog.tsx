import { useState } from 'react'
import { Button } from '../ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/dialog.tsx'

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  pending?: boolean
  onSubmit: (reason: string) => Promise<void> | void
}

/** Diálogo para acciones que exigen motivo (reversos, cancelaciones). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  pending = false,
  onSubmit,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const value = reason.trim()
    if (value.length < 3) {
      setError('Escribe el motivo (mínimo 3 caracteres).')
      return
    }
    setError(null)
    await onSubmit(value)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <div className="mt-4">
          <label htmlFor="reason" className="mb-1 block text-sm font-medium text-slate-700">
            Motivo
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            aria-invalid={error ? true : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'
            }`}
          />
          {error && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void handleSubmit()} disabled={pending}>
            {pending ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
