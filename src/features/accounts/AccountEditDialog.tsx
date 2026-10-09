import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Checkbox } from '../../components/ui/checkbox.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { toast } from '../../lib/toast.ts'
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
      toast('Cambios de la cuenta guardados.')
      onOpenChange(false)
    },
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={form.formState.isDirty}>
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
            <div className="space-y-1">
              <Checkbox
                label="Cuenta para decisiones (saldo gastable)"
                {...form.register('isSpendable')}
              />
              <Checkbox
                label="Usar como cuenta predeterminada"
                {...form.register('isDefault')}
              />
            </div>
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending}>Guardar cambios</SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
