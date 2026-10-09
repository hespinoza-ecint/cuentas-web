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
import { createAccount } from './accounts-api.ts'

const createSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
    type: z.enum(['CASH', 'DEBIT', 'SAVINGS', 'OTHER']),
    isSpendable: z.boolean(),
    isDefault: z.boolean(),
    openingBalance: z.number().int('Monto inválido').min(1, 'El saldo debe ser mayor a cero').optional(),
    openingDate: z.string(),
  })
  .refine((values) => values.openingBalance === undefined || /^\d{4}-\d{2}-\d{2}$/.test(values.openingDate), {
    path: ['openingDate'],
    message: 'Indica la fecha del saldo inicial',
  })

type CreateForm = z.infer<typeof createSchema>

export function AccountFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      type: 'DEBIT',
      isSpendable: true,
      isDefault: false,
      openingBalance: undefined,
      openingDate: today,
    },
  })

  const mutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onOpenChange(false)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({
      name: values.name,
      type: values.type,
      isSpendable: values.isSpendable,
      isDefault: values.isDefault,
      ...(values.openingBalance !== undefined
        ? { openingBalance: values.openingBalance, openingDate: values.openingDate }
        : {}),
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogTitle>Nueva cuenta</DialogTitle>
          <DialogDescription>
            El saldo inicial se registra como el primer movimiento de la cuenta.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Nombre"
              placeholder="Débito BBVA"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <SelectField label="Tipo" error={form.formState.errors.type?.message} {...form.register('type')}>
              <option value="CASH">Efectivo</option>
              <option value="DEBIT">Débito</option>
              <option value="SAVINGS">Ahorro</option>
              <option value="OTHER">Otra</option>
            </SelectField>
            <Controller
              name="openingBalance"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="openingBalance"
                  label="Saldo inicial (opcional)"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.openingBalance?.message}
                />
              )}
            />
            <Field
              label="Fecha del saldo inicial"
              type="date"
              max={today}
              error={form.formState.errors.openingDate?.message}
              {...form.register('openingDate')}
            />

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  className="size-4 rounded border-line-strong"
                  {...form.register('isSpendable')}
                />
                Cuenta para decisiones (saldo gastable)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  className="size-4 rounded border-line-strong"
                  {...form.register('isDefault')}
                />
                Usar como cuenta predeterminada
              </label>
            </div>
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
