import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import { createCard, updateCard, type CreditCard } from './cards-api.ts'

function integerText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, 'Requerido')
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      `Debe ser un entero entre ${min} y ${max}`,
    )
}

function decimalText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, 'Requerido')
    .refine((value) => {
      const number = Number(value.replace(',', '.'))
      return Number.isFinite(number) && number >= min && number <= max
    }, `Debe estar entre ${min} y ${max}`)
}

const cardSchema = z.object({
  alias: z.string().trim().min(1, 'El alias es obligatorio').max(60, 'Máximo 60 caracteres'),
  institution: z.string().trim().min(1, 'La institución es obligatoria').max(80, 'Máximo 80 caracteres'),
  last4: z.string().trim().regex(/^\d{4}$/, 'Deben ser exactamente 4 dígitos'),
  creditLimit: z.number({ message: 'Captura el límite' }).int().min(1, 'El límite debe ser mayor a cero'),
  annualRatePercent: decimalText(0, 100),
  annualFee: z.number().int().min(0).optional(),
  annualFeeMonth: z.string().optional(),
  cutDay: integerText(1, 31),
  dueDateMode: z.enum(['DAYS_AFTER_CUT', 'FIXED_DAY']),
  dueDay: integerText(1, 31),
  dueDaysAfterCut: integerText(1, 60),
  dueNonBusinessDayRule: z.enum(['PREVIOUS', 'NEXT', 'NONE']),
  sameDayCutIncluded: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  openingBalance: z.number().int().min(1).optional(),
  openingDate: z.string(),
})

type CardForm = z.infer<typeof cardSchema>

export function CardFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: CreditCard | null
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      alias: editing?.alias ?? '',
      institution: editing?.institution ?? '',
      last4: editing?.last4 ?? '',
      creditLimit: editing?.creditLimit,
      annualRatePercent: editing ? String(editing.annualRateBps / 100) : '0',
      annualFee: editing?.annualFee ?? undefined,
      annualFeeMonth: editing?.annualFeeMonth ? String(editing.annualFeeMonth) : '',
      cutDay: editing ? String(editing.cutDay) : '15',
      dueDateMode: (editing?.dueDateMode as 'FIXED_DAY' | 'DAYS_AFTER_CUT') ?? 'DAYS_AFTER_CUT',
      dueDay: editing?.dueDay ? String(editing.dueDay) : '15',
      dueDaysAfterCut: editing?.dueDaysAfterCut ? String(editing.dueDaysAfterCut) : '20',
      dueNonBusinessDayRule:
        (editing?.dueNonBusinessDayRule as 'PREVIOUS' | 'NEXT' | 'NONE') ?? 'PREVIOUS',
      sameDayCutIncluded: editing?.sameDayCutIncluded ?? true,
      status: (editing?.status as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE',
      openingBalance: undefined,
      openingDate: today,
    },
  })

  const dueDateMode = useWatch({ control: form.control, name: 'dueDateMode' })

  const mutation = useMutation({
    mutationFn: (values: CardForm) => {
      const base = {
        alias: values.alias,
        institution: values.institution,
        last4: values.last4,
        creditLimit: values.creditLimit,
        annualRateBps: Math.round(Number(values.annualRatePercent.replace(',', '.')) * 100),
        cutDay: Number(values.cutDay),
        dueDateMode: values.dueDateMode,
        dueNonBusinessDayRule: values.dueNonBusinessDayRule,
        sameDayCutIncluded: values.sameDayCutIncluded,
        ...(values.dueDateMode === 'FIXED_DAY'
          ? { dueDay: Number(values.dueDay) }
          : { dueDaysAfterCut: Number(values.dueDaysAfterCut) }),
        ...(values.annualFee !== undefined ? { annualFee: values.annualFee } : {}),
        ...(values.annualFeeMonth ? { annualFeeMonth: Number(values.annualFeeMonth) } : {}),
      }

      if (editing) {
        return updateCard(editing.id, { ...base, status: values.status })
      }
      return createCard({
        ...base,
        ...(values.openingBalance !== undefined
          ? { openingBalance: values.openingBalance, openingDate: values.openingDate }
          : {}),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>{editing ? 'Editar tarjeta' : 'Nueva tarjeta'}</DialogTitle>
          <DialogDescription>
            El corte y la fecha límite siguen las reglas RN-12/13/14 del backend.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Alias" error={form.formState.errors.alias?.message} {...form.register('alias')} />
              <Field
                label="Institución"
                error={form.formState.errors.institution?.message}
                {...form.register('institution')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Últimos 4 dígitos"
                maxLength={4}
                inputMode="numeric"
                error={form.formState.errors.last4?.message}
                {...form.register('last4')}
              />
              <Controller
                name="creditLimit"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="creditLimit"
                    label="Límite de crédito"
                    valueCents={field.value}
                    onCentsChange={field.onChange}
                    error={form.formState.errors.creditLimit?.message}
                  />
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Tasa anual (%)"
                inputMode="decimal"
                error={form.formState.errors.annualRatePercent?.message}
                {...form.register('annualRatePercent')}
              />
              <div>
                <Controller
                  name="annualFee"
                  control={form.control}
                  render={({ field }) => (
                    <MoneyInput
                      id="annualFee"
                      label="Anualidad (opcional)"
                      valueCents={field.value}
                      onCentsChange={field.onChange}
                      error={form.formState.errors.annualFee?.message}
                    />
                  )}
                />
              </div>
            </div>
            <SelectField label="Mes de la anualidad (opcional)" {...form.register('annualFeeMonth')}>
              <option value="">Sin anualidad</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={String(month)}>
                  {month}
                </option>
              ))}
            </SelectField>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Día de corte"
                inputMode="numeric"
                error={form.formState.errors.cutDay?.message}
                {...form.register('cutDay')}
              />
              <SelectField label="Fecha límite" {...form.register('dueDateMode')}>
                <option value="DAYS_AFTER_CUT">Días después del corte</option>
                <option value="FIXED_DAY">Día fijo del mes</option>
              </SelectField>
            </div>
            {dueDateMode === 'FIXED_DAY' ? (
              <Field
                label="Día de pago"
                inputMode="numeric"
                error={form.formState.errors.dueDay?.message}
                {...form.register('dueDay')}
              />
            ) : (
              <Field
                label="Días después del corte"
                inputMode="numeric"
                error={form.formState.errors.dueDaysAfterCut?.message}
                {...form.register('dueDaysAfterCut')}
              />
            )}
            <SelectField label="Si la fecha límite cae en día inhábil" {...form.register('dueNonBusinessDayRule')}>
              <option value="PREVIOUS">Mover al día hábil anterior</option>
              <option value="NEXT">Mover al día hábil siguiente</option>
              <option value="NONE">No ajustar</option>
            </SelectField>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                {...form.register('sameDayCutIncluded')}
              />
              La compra el día del corte entra en ese corte (RN-14)
            </label>

            {editing ? (
              <SelectField label="Estado" {...form.register('status')}>
                <option value="ACTIVE">Activa</option>
                <option value="INACTIVE">Inactiva</option>
              </SelectField>
            ) : (
              <>
                <Controller
                  name="openingBalance"
                  control={form.control}
                  render={({ field }) => (
                    <MoneyInput
                      id="cardOpeningBalance"
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
                  {...form.register('openingDate')}
                />
              </>
            )}
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear tarjeta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
