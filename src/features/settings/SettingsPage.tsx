import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { fetchSettings, updateSettings, type UserSettings } from '../users/users-api.ts'

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

function integerText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, 'Requerido')
    .refine((value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      `Debe ser un entero entre ${min} y ${max}`)
}

const settingsSchema = z.object({
  timezone: z.string().trim().min(1, 'La zona horaria es obligatoria').max(64, 'Máximo 64 caracteres'),
  holidayCalendarCode: z.enum(['MX_LABOR', 'MX_BANKING']),
  minCashBuffer: z.number({ message: 'Captura un monto' }).int().min(0),
  maxUtilizationPercent: decimalText(0, 100),
  variableIncomeFactorPercent: decimalText(0, 100),
  pendingIncomeGraceDays: integerText(0, 30),
  backdateLimitDays: integerText(0, 365),
  projectionMinDays: integerText(1, 365),
})

type SettingsForm = z.infer<typeof settingsSchema>

function toFormValues(settings: UserSettings): SettingsForm {
  return {
    timezone: settings.timezone,
    holidayCalendarCode: settings.holidayCalendarCode as 'MX_LABOR' | 'MX_BANKING',
    minCashBuffer: settings.minCashBuffer,
    maxUtilizationPercent: String(settings.maxUtilizationBps / 100),
    variableIncomeFactorPercent: String(settings.variableIncomeFactorBps / 100),
    pendingIncomeGraceDays: String(settings.pendingIncomeGraceDays),
    backdateLimitDays: String(settings.backdateLimitDays),
    projectionMinDays: String(settings.projectionMinDays),
  }
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      timezone: 'America/Mexico_City',
      holidayCalendarCode: 'MX_BANKING',
      minCashBuffer: 0,
      maxUtilizationPercent: '30',
      variableIncomeFactorPercent: '90',
      pendingIncomeGraceDays: '3',
      backdateLimitDays: '60',
      projectionMinDays: '60',
    },
  })

  useEffect(() => {
    if (settings.data) {
      form.reset(toFormValues(settings.data))
    }
  }, [settings.data, form])

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      setSaved(true)
      form.reset(toFormValues(updated))
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setSaved(false)
    mutation.mutate({
      timezone: values.timezone,
      holidayCalendarCode: values.holidayCalendarCode,
      minCashBuffer: values.minCashBuffer,
      maxUtilizationBps: Math.round(Number(values.maxUtilizationPercent.replace(',', '.')) * 100),
      variableIncomeFactorBps: Math.round(
        Number(values.variableIncomeFactorPercent.replace(',', '.')) * 100,
      ),
      pendingIncomeGraceDays: Number(values.pendingIncomeGraceDays),
      backdateLimitDays: Number(values.backdateLimitDays),
      projectionMinDays: Number(values.projectionMinDays),
    })
  })

  return (
    <div data-testid="settings-page">
      <PageHeader
        title="Configuración"
        description="Reglas financieras que usan el flujo de efectivo y las recomendaciones"
      />

      {settings.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      )}
      {settings.isError && (
        <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      )}

      {settings.data && (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Card>
            <CardTitle>Región y calendario</CardTitle>
            <CardDescription>
              La zona horaria define cuál es “hoy” y los días inhábiles ajustan las fechas de
              pago.
            </CardDescription>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Zona horaria"
                hint="Ejemplo: America/Mexico_City"
                error={form.formState.errors.timezone?.message}
                {...form.register('timezone')}
              />
              <SelectField label="Calendario de festivos" {...form.register('holidayCalendarCode')}>
                <option value="MX_BANKING">Bancario (días inhábiles de banco)</option>
                <option value="MX_LABOR">Laboral (días festivos oficiales)</option>
              </SelectField>
            </div>
          </Card>

          <Card>
            <CardTitle>Colchón y utilización</CardTitle>
            <CardDescription>
              El colchón mínimo y la utilización máxima se usan para calificar las opciones en las
              recomendaciones.
            </CardDescription>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Controller
                name="minCashBuffer"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="minCashBuffer"
                    name="minCashBuffer"
                    label="Colchón mínimo de efectivo"
                    valueCents={field.value}
                    onCentsChange={field.onChange}
                    onBlur={field.onBlur}
                    error={form.formState.errors.minCashBuffer?.message}
                  />
                )}
              />
              <Field
                label="Utilización máxima de crédito (%)"
                type="text"
                inputMode="decimal"
                error={form.formState.errors.maxUtilizationPercent?.message}
                {...form.register('maxUtilizationPercent')}
              />
            </div>
          </Card>

          <Card>
            <CardTitle>Ingresos y proyección</CardTitle>
            <CardDescription>
              Los ingresos variables se proyectan con un factor conservador; las fechas vencidas
              dejan de proyectarse tras los días de gracia.
            </CardDescription>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Factor de ingresos variables (%)"
                type="text"
                inputMode="decimal"
                error={form.formState.errors.variableIncomeFactorPercent?.message}
                {...form.register('variableIncomeFactorPercent')}
              />
              <Field
                label="Días de gracia de ingresos"
                type="text"
                inputMode="numeric"
                error={form.formState.errors.pendingIncomeGraceDays?.message}
                {...form.register('pendingIncomeGraceDays')}
              />
              <Field
                label="Límite de días hacia atrás"
                type="text"
                inputMode="numeric"
                error={form.formState.errors.backdateLimitDays?.message}
                {...form.register('backdateLimitDays')}
              />
              <Field
                label="Horizonte mínimo de proyección (días)"
                type="text"
                inputMode="numeric"
                error={form.formState.errors.projectionMinDays?.message}
                {...form.register('projectionMinDays')}
              />
            </div>
          </Card>

          <div className="space-y-3">
            <ErrorAlert error={mutation.error} />
            {saved && <SuccessAlert message="Configuración guardada." />}
            <SubmitButton pending={mutation.isPending}>Guardar configuración</SubmitButton>
          </div>
        </form>
      )}
    </div>
  )
}
