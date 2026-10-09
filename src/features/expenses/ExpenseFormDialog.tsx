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
import type { CashAccount } from '../accounts/accounts-api.ts'
import type { Category } from '../categories/categories-api.ts'
import { useToday } from '../users/use-settings.ts'
import { createExpense } from './expenses-api.ts'

const expenseSchema = z.object({
  cashAccountId: z.string().min(1, 'Elige la cuenta'),
  categoryId: z.string().optional(),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(200, 'Máximo 200 caracteres'),
  amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
  notes: z.string().trim().max(300, 'Máximo 300 caracteres').optional(),
})

type ExpenseForm = z.infer<typeof expenseSchema>

export function ExpenseFormDialog({
  accounts,
  categories,
  open,
  onOpenChange,
}: {
  accounts: CashAccount[]
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      cashAccountId: accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? '',
      categoryId: '',
      description: '',
      amount: undefined,
      expenseDate: today,
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ExpenseForm) =>
      createExpense({
        cashAccountId: values.cashAccountId,
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        description: values.description,
        amount: values.amount,
        expenseDate: values.expenseDate,
        ...(values.notes ? { notes: values.notes } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast('Gasto registrado.')
      onOpenChange(false)
    },
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={form.formState.isDirty}
    >
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>El gasto se descuenta del saldo de la cuenta elegida.</DialogDescription>

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
            <SelectField label="Categoría (opcional)" {...form.register('categoryId')}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <Field
              label="Descripción"
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="expenseAmount"
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
              error={form.formState.errors.expenseDate?.message}
              {...form.register('expenseDate')}
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
            <SubmitButton pending={mutation.isPending}>Registrar gasto</SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
