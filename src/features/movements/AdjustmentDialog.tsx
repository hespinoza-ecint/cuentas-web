import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { useToday } from '../users/use-settings.ts'
import type { CashAccount } from '../accounts/accounts-api.ts'
import { createAdjustment } from './movements-api.ts'

const adjustmentSchema = z.object({
  cashAccountId: z.string().min(1, 'Elige la cuenta'),
  amount: z
    .number({ message: 'Captura el monto' })
    .int()
    .refine((value) => value !== 0, 'El monto debe ser distinto de cero'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(200, 'Máximo 200 caracteres'),
  reason: z.string().trim().min(3, 'El motivo es obligatorio').max(300, 'Máximo 300 caracteres'),
})

type AdjustmentForm = z.infer<typeof adjustmentSchema>

export function AdjustmentDialog({
  accounts,
  open,
  onOpenChange,
}: {
  accounts: CashAccount[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<AdjustmentForm>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      cashAccountId: accounts[0]?.id ?? '',
      amount: undefined,
      occurredOn: today,
      description: '',
      reason: '',
    },
  })

  const mutation = useMutation({
    mutationFn: createAdjustment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Ajuste manual</DialogTitle>
          <DialogDescription>
            Usa montos negativos para reducir el saldo. Todo ajuste exige motivo (RN-05).
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <SelectField
              label="Cuenta"
              error={form.formState.errors.cashAccountId?.message}
              {...form.register('cashAccountId')}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="amount"
                  label="Monto (puede ser negativo)"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.amount?.message}
                />
              )}
            />
            <Field
              label="Fecha"
              type="date"
              max={today}
              error={form.formState.errors.occurredOn?.message}
              {...form.register('occurredOn')}
            />
            <Field
              label="Descripción"
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
            <Field
              label="Motivo"
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
              {mutation.isPending ? 'Guardando…' : 'Registrar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
