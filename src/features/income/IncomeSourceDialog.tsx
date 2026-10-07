import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { ScheduleEditor } from '../../components/shared/ScheduleEditor.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import {
  emptyScheduleValue,
  scheduleValueFrom,
  scheduleValueToPayload,
  validateSchedule,
  type ScheduleFormValue,
} from '../../lib/schedule-form.ts'
import type { CashAccount } from '../accounts/accounts-api.ts'
import type { Category } from '../categories/categories-api.ts'
import { useToday } from '../users/use-settings.ts'
import { createSource, updateSource, type IncomeSource } from './income-api.ts'

const sourceSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'Máximo 120 caracteres'),
  cashAccountId: z.string().min(1, 'Elige la cuenta donde se deposita'),
  categoryId: z.string().optional(),
  payer: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
  amountType: z.enum(['FIXED', 'VARIABLE']),
  estimatedAmount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
  isActive: z.boolean(),
})

type SourceForm = z.infer<typeof sourceSchema>

export function IncomeSourceDialog({
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
  editing?: IncomeSource | null
}) {
  const queryClient = useQueryClient()
  const today = useToday()
  const firstSchedule = editing?.schedules.find((schedule) => schedule.isActive) ?? editing?.schedules[0]
  const [schedule, setSchedule] = useState<ScheduleFormValue>(() =>
    firstSchedule ? scheduleValueFrom(firstSchedule) : emptyScheduleValue(today),
  )
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const form = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      name: editing?.name ?? '',
      cashAccountId: editing?.cashAccountId ?? accounts[0]?.id ?? '',
      categoryId: editing?.categoryId ?? '',
      payer: editing?.payer ?? '',
      amountType: (editing?.amountType as 'FIXED' | 'VARIABLE') ?? 'FIXED',
      estimatedAmount: editing?.estimatedAmount,
      isActive: editing?.isActive ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: SourceForm) => {
      if (editing) {
        return updateSource(editing.id, {
          name: values.name,
          cashAccountId: values.cashAccountId,
          ...(values.categoryId ? { categoryId: values.categoryId } : {}),
          ...(values.payer ? { payer: values.payer } : {}),
          amountType: values.amountType,
          estimatedAmount: values.estimatedAmount,
          isActive: values.isActive,
        })
      }
      return createSource({
        name: values.name,
        cashAccountId: values.cashAccountId,
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        ...(values.payer ? { payer: values.payer } : {}),
        amountType: values.amountType,
        estimatedAmount: values.estimatedAmount,
        schedules: [scheduleValueToPayload(schedule)],
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      void queryClient.invalidateQueries({ queryKey: ['income-upcoming'] })
      onOpenChange(false)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    if (!editing) {
      const error = validateSchedule(schedule)
      setScheduleError(error)
      if (error) {
        return
      }
    }
    mutation.mutate(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogTitle>{editing ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'}</DialogTitle>
          <DialogDescription>
            Los ingresos variables se proyectan con el factor conservador (RN-10).
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Nombre"
              placeholder="Sueldo"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Cuenta" {...form.register('cashAccountId')}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Tipo de monto" {...form.register('amountType')}>
                <option value="FIXED">Fijo</option>
                <option value="VARIABLE">Variable</option>
              </SelectField>
            </div>
            <Controller
              name="estimatedAmount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="estimatedAmount"
                  label="Monto estimado"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.estimatedAmount?.message}
                />
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Categoría (opcional)" {...form.register('categoryId')}>
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Pagador (opcional)"
                error={form.formState.errors.payer?.message}
                {...form.register('payer')}
              />
            </div>

            {!editing && (
              <ScheduleEditor
                value={schedule}
                onChange={setSchedule}
                error={scheduleError ?? undefined}
              />
            )}

            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  {...form.register('isActive')}
                />
                Fuente activa
              </label>
            )}
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear fuente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
