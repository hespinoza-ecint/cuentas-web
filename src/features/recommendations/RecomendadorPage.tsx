import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { Checkbox } from '../../components/ui/checkbox.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { listCards } from '../cards/cards-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import { PurchaseFormDialog } from '../purchases/PurchaseFormDialog.tsx'
import { useToday } from '../users/use-settings.ts'
import { RecommendationResultView } from './RecommendationResultView.tsx'
import {
  createRecommendation,
  type RecommendationResult,
} from './recommendations-api.ts'

const schema = z
  .object({
    amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
    type: z.enum(['REGULAR', 'MSI', 'DEFERRED_INTEREST']),
    months: z.string().optional(),
    annualRatePercent: z.string().optional(),
    eligibleCardIds: z.array(z.string()).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type !== 'REGULAR') {
      const months = Number(values.months)
      if (!Number.isInteger(months) || months < 2 || months > 48) {
        ctx.addIssue({ code: 'custom', path: ['months'], message: 'Los meses deben estar entre 2 y 48' })
      }
    }
    if (values.type === 'DEFERRED_INTEREST') {
      const rate = Number((values.annualRatePercent ?? '').replace(',', '.'))
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        ctx.addIssue({ code: 'custom', path: ['annualRatePercent'], message: 'Indica la tasa anual (0 a 100)' })
      }
    }
  })

type RecommendationForm = z.infer<typeof schema>

export function RecomendadorPage() {
  const today = useToday()
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })
  const categories = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => listCategories('EXPENSE'),
  })

  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)

  const form = useForm<RecommendationForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      purchaseDate: today,
      type: 'REGULAR',
      months: '3',
      annualRatePercent: '0',
      eligibleCardIds: [],
    },
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const submitted = form.getValues()

  const mutation = useMutation({
    mutationFn: (values: RecommendationForm) =>
      createRecommendation({
        amount: values.amount,
        purchaseDate: values.purchaseDate,
        type: values.type,
        ...(values.type !== 'REGULAR'
          ? {
              months: Number(values.months),
              annualRateBps:
                values.type === 'DEFERRED_INTEREST'
                  ? Math.round(Number((values.annualRatePercent ?? '0').replace(',', '.')) * 100)
                  : 0,
            }
          : {}),
        ...(values.type === 'MSI' && (values.eligibleCardIds ?? []).length > 0
          ? { eligibleCardIds: values.eligibleCardIds }
          : {}),
      }),
    onSuccess: (data) => setResult(data),
  })

  const activeCards = (cards.data ?? []).filter((card) => card.status === 'ACTIVE')

  return (
    <div data-testid="recomendador-page">
      <PageHeader
        title="¿Qué tarjeta uso?"
        description="Comparamos tus tarjetas y el efectivo con tu flujo real del mes"
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardTitle>Nueva consulta</CardTitle>
          <CardDescription>Sin compromiso: recomendar no modifica tus saldos.</CardDescription>
          <form
            className="mt-4 space-y-4"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              setResult(null)
              mutation.mutate(values)
            })}
          >
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="recommendationAmount"
                  label="Monto de la compra"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.amount?.message}
                />
              )}
            />
            <Field
              label="Fecha de compra"
              type="date"
              max={today}
              error={form.formState.errors.purchaseDate?.message}
              {...form.register('purchaseDate')}
            />
            <SelectField label="Tipo" {...form.register('type')}>
              <option value="REGULAR">Regular (una exhibición)</option>
              <option value="MSI">Meses sin intereses</option>
              <option value="DEFERRED_INTEREST">Diferida con intereses</option>
            </SelectField>

            {type !== 'REGULAR' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Meses"
                  inputMode="numeric"
                  error={form.formState.errors.months?.message}
                  {...form.register('months')}
                />
                {type === 'DEFERRED_INTEREST' && (
                  <Field
                    label="Tasa anual (%)"
                    inputMode="decimal"
                    error={form.formState.errors.annualRatePercent?.message}
                    {...form.register('annualRatePercent')}
                  />
                )}
              </div>
            )}

            {type === 'MSI' && activeCards.length > 0 && (
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-ink-secondary">
                  Tarjetas elegibles (opcional)
                </legend>
                <p className="mb-1 text-xs text-ink-muted">
                  Sin selección se evalúan todas las tarjetas activas.
                </p>
                <div className="space-y-1">
                  {activeCards.map((card) => (
                    <Checkbox
                      key={card.id}
                      label={`${card.alias} ····${card.last4}`}
                      value={card.id}
                      {...form.register('eligibleCardIds')}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <ErrorAlert error={mutation.error} />

            <SubmitButton pending={mutation.isPending} pendingLabel="Evaluando…" className="w-full">
              <Sparkles className="size-4" aria-hidden="true" />
              Recomendar
            </SubmitButton>
          </form>
        </Card>

        <div>
          {mutation.isPending && (
            <Card className="py-16 text-center">
              <p className="animate-pulse text-sm text-ink-muted">
                Simulando tarjetas y flujo de efectivo…
              </p>
            </Card>
          )}

          {!mutation.isPending && !result && (
            <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
              <Sparkles className="size-8 text-ink-muted" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-ink-secondary">Aún no hay recomendación</p>
              <p className="mt-1 max-w-sm text-xs text-ink-muted">
                Captura el monto y la fecha para ver la mejor opción con sus motivos, advertencias
                y alternativas.
              </p>
            </Card>
          )}

          {result && (
            <RecommendationResultView
              result={result}
              onRegisterPurchase={() => setPurchaseOpen(true)}
            />
          )}
        </div>
      </div>

      {purchaseOpen && result && (
        <PurchaseFormDialog
          cards={cards.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={setPurchaseOpen}
          initial={{
            creditCardId: result.recommended?.cardId,
            amount: submitted.amount,
            purchaseDate: submitted.purchaseDate,
            type: submitted.type,
            months: submitted.months,
            annualRatePercent: submitted.annualRatePercent,
            recommendationId: result.historyId,
          }}
        />
      )}
    </div>
  )
}
