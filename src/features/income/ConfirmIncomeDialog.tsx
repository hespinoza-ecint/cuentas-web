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
import { formatLocalDate } from '../../lib/dates.ts'
import { useToday } from '../users/use-settings.ts'
import { confirmIncome, type UpcomingIncomeItem } from './income-api.ts'

const confirmSchema = z.object({
  actualAmount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
  actualDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
  notes: z.string().trim().max(300, 'Máximo 300 caracteres').optional(),
})

type ConfirmForm = z.infer<typeof confirmSchema>

export function ConfirmIncomeDialog({
  occurrence,
  open,
  onOpenChange,
}: {
  occurrence: UpcomingIncomeItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<ConfirmForm>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      actualAmount: occurrence.expectedAmount,
      actualDate: today,
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ConfirmForm) =>
      confirmIncome({
        incomeSourceId: occurrence.incomeSourceId,
        incomeScheduleId: occurrence.incomeScheduleId,
        expectedDate: occurrence.expectedDate,
        actualAmount: values.actualAmount,
        actualDate: values.actualDate,
        ...(values.notes ? { notes: values.notes } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['income-upcoming'] })
      void queryClient.invalidateQueries({ queryKey: ['income-transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Confirmar ingreso</DialogTitle>
          <DialogDescription>
            {occurrence.incomeSourceName} · esperado el {formatLocalDate(occurrence.expectedDate)}
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Controller
              name="actualAmount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="actualAmount"
                  label="Monto recibido"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.actualAmount?.message}
                />
              )}
            />
            <Field
              label="Fecha real"
              type="date"
              max={today}
              error={form.formState.errors.actualDate?.message}
              {...form.register('actualDate')}
            />
            <Field
              label="Notas (opcional)"
              error={form.formState.errors.notes?.message}
              {...form.register('notes')}
            />
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Confirmando…' : 'Confirmar ingreso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
