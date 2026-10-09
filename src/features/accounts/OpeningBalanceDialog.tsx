import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { Button } from '../../components/ui/button.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { toast } from '../../lib/toast.ts'
import { useToday } from '../users/use-settings.ts'
import { setOpeningBalance, type CashAccount } from './accounts-api.ts'

const openingSchema = z.object({
  amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
})

type OpeningForm = z.infer<typeof openingSchema>

export function OpeningBalanceDialog({
  account,
  open,
  onOpenChange,
}: {
  account: CashAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<OpeningForm>({
    resolver: zodResolver(openingSchema),
    defaultValues: { amount: undefined, occurredOn: today },
  })

  const mutation = useMutation({
    mutationFn: (values: OpeningForm) =>
      setOpeningBalance(account.id, values.amount, values.occurredOn),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      toast('Saldo inicial registrado.')
      onOpenChange(false)
    },
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={form.formState.isDirty}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Registrar saldo inicial</DialogTitle>
          <DialogDescription>
            {account.name}. Solo puede registrarse una vez por cuenta.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="openingAmount"
                  label="Saldo inicial"
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
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending} pendingLabel="Registrando…">
              Registrar saldo
            </SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
