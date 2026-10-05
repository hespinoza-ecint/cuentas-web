import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { updateAccount, type CashAccount } from './accounts-api.ts'

const editSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  isSpendable: z.boolean(),
  isDefault: z.boolean(),
})

type EditForm = z.infer<typeof editSchema>

export function AccountEditDialog({
  account,
  open,
  onOpenChange,
}: {
  account: CashAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: account.name,
      status: account.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      isSpendable: account.isSpendable,
      isDefault: account.isDefault,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: EditForm) => updateAccount(account.id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Editar cuenta</DialogTitle>
          <DialogDescription>{account.name}</DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Nombre"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <SelectField label="Estado" {...form.register('status')}>
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
            </SelectField>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  {...form.register('isSpendable')}
                />
                Cuenta para decisiones (saldo gastable)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
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
              {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
