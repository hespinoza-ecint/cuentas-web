import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { ScheduleEditor } from '../../components/shared/ScheduleEditor.tsx'
import {
  emptyScheduleValue,
  scheduleValueFrom,
  scheduleValueToPayload,
  validateSchedule,
  type ScheduleFormValue,
} from '../../lib/schedule-form.ts'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import type { CashAccount } from '../accounts/accounts-api.ts'
import type { Category } from '../categories/categories-api.ts'
import { useToday } from '../users/use-settings.ts'
import {
  createRecurring,
  updateRecurring,
  type RecurringExpense,
} from './recurring-expenses-api.ts'

const recurringSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'Máximo 120 caracteres'),
  amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
  amountType: z.enum(['FIXED', 'VARIABLE']),
  cashAccountId: z.string().min(1, 'Elige la cuenta'),
  categoryId: z.string().optional(),
  isActive: z.boolean(),
})

type RecurringForm = z.infer<typeof recurringSchema>

export function RecurringFormDialog({
  accounts,
  categories,
  open,
  onOpenChange,
  editing,
}: {
  accounts: CashAccount[]
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: RecurringExpense | null
}) {
  const queryClient = useQueryClient()
  const today = useToday()
  const [schedule, setSchedule] = useState<ScheduleFormValue>(() =>
    editing
      ? scheduleValueFrom({
          frequency: editing.frequency,
          config: editing.config,
          nonBusinessDayRule: editing.nonBusinessDayRule,
          useHolidays: editing.useHolidays,
          startDate: editing.startDate,
          endDate: editing.endDate,
        })
      : emptyScheduleValue(today),
  )
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const form = useForm<RecurringForm>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: editing?.name ?? '',
      amount: editing?.amount,
      amountType: (editing?.amountType as 'FIXED' | 'VARIABLE') ?? 'FIXED',
      cashAccountId: editing?.cashAccountId ?? accounts[0]?.id ?? '',
      categoryId: editing?.categoryId ?? '',
      isActive: editing?.isActive ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: RecurringForm) => {
      const schedulePayload = scheduleValueToPayload(schedule)
      if (editing) {
        return updateRecurring(editing.id, {
          name: values.name,
          amount: values.amount,
          amountType: values.amountType,
          cashAccountId: values.cashAccountId,
          ...(values.categoryId ? { categoryId: values.categoryId } : {}),
          config: schedulePayload.config,
          nonBusinessDayRule: schedulePayload.nonBusinessDayRule,
          useHolidays: schedulePayload.useHolidays,
          startDate: schedulePayload.startDate,
          ...(schedulePayload.endDate ? { endDate: schedulePayload.endDate } : {}),
          isActive: values.isActive,
        })
      }
      return createRecurring({
        name: values.name,
        amount: values.amount,
        amountType: values.amountType,
        cashAccountId: values.cashAccountId,
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        schedule: schedulePayload,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['recurring-upcoming'] })
      onOpenChange(false)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const error = validateSchedule(schedule)
    setScheduleError(error)
    if (error) {
      return
    }
    mutation.mutate(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} noValidate>
          <DialogTitle>{editing ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}</DialogTitle>
          <DialogDescription>
            El gasto se registra al confirmar cada ocurrencia; los días inhábiles ajustan la fecha
            (RN-09).
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Nombre"
              placeholder="Renta"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="recurringAmount"
                  label="Monto"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.amount?.message}
                />
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Tipo de monto" {...form.register('amountType')}>
                <option value="FIXED">Fijo</option>
                <option value="VARIABLE">Variable</option>
              </SelectField>
              <SelectField label="Cuenta" {...form.register('cashAccountId')}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <SelectField label="Categoría (opcional)" {...form.register('categoryId')}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>

            <ScheduleEditor
              value={schedule}
              onChange={setSchedule}
              error={scheduleError ?? undefined}
              lockFrequency={Boolean(editing)}
            />

            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  {...form.register('isActive')}
                />
                Recurrente activo
              </label>
            )}
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear recurrente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
