import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { toast } from '../../lib/toast.ts'
import { useToday } from '../users/use-settings.ts'
import { transfer, type CashAccount } from './accounts-api.ts'

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Elige la cuenta de origen'),
    toAccountId: z.string().min(1, 'Elige la cuenta de destino'),
    amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
    description: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    path: ['toAccountId'],
    message: 'Las cuentas deben ser distintas',
  })

type TransferForm = z.infer<typeof transferSchema>

export function TransferDialog({
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

  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: accounts[0]?.id ?? '',
      toAccountId: accounts[1]?.id ?? '',
      amount: undefined,
      occurredOn: today,
      description: '',
    },
  })

  const mutation = useMutation({
    mutationFn: transfer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      toast('Transferencia registrada.')
      onOpenChange(false)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({
      fromAccountId: values.fromAccountId,
      toAccountId: values.toAccountId,
      amount: values.amount,
      occurredOn: values.occurredOn,
      ...(values.description ? { description: values.description } : {}),
    })
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={form.formState.isDirty}>
      <form onSubmit={onSubmit} noValidate>
          <DialogTitle>Transferencia entre cuentas</DialogTitle>
          <DialogDescription>Mueve saldo de una cuenta a otra sin afectar tus totales.</DialogDescription>

          <div className="mt-4 space-y-4">
            <SelectField
              label="Desde"
              error={form.formState.errors.fromAccountId?.message}
              {...form.register('fromAccountId')}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Hacia"
              error={form.formState.errors.toAccountId?.message}
              {...form.register('toAccountId')}
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
                  label="Monto"
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
              label="Descripción (opcional)"
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending} pendingLabel="Transfiriendo…">
              Transferir
            </SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
