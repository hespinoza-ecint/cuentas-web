import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { useToday } from '../users/use-settings.ts'
import { reconcileCard, type CreditCard } from './cards-api.ts'

const reconcileSchema = z.object({
  reportedBalance: z.number({ message: 'Captura el saldo' }).int().min(0, 'El saldo no puede ser negativo'),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
  reason: z.string().trim().min(3, 'El motivo es obligatorio').max(300, 'Máximo 300 caracteres'),
})

type ReconcileForm = z.infer<typeof reconcileSchema>

export function ReconcileDialog({
  card,
  open,
  onOpenChange,
  onReconciled,
}: {
  card: CreditCard
  open: boolean
  onOpenChange: (open: boolean) => void
  onReconciled?: (difference: number) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<ReconcileForm>({
    resolver: zodResolver(reconcileSchema),
    defaultValues: { reportedBalance: card.currentBalance, asOfDate: today, reason: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: ReconcileForm) => reconcileCard(card.id, values),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onReconciled?.(result.difference)
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Conciliar con el banco</DialogTitle>
          <DialogDescription>
            {card.alias}: se ajusta el saldo a lo reportado y queda registrado en el libro (RN-15).
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Controller
              name="reportedBalance"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="reportedBalance"
                  label="Saldo reportado por el banco"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.reportedBalance?.message}
                />
              )}
            />
            <Field
              label="Fecha de corte de la conciliación"
              type="date"
              max={today}
              error={form.formState.errors.asOfDate?.message}
              {...form.register('asOfDate')}
            />
            <Field
              label="Motivo"
              placeholder="Estado de cuenta del banco"
              error={form.formState.errors.reason?.message}
              {...form.register('reason')}
            />
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Conciliando…' : 'Conciliar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
