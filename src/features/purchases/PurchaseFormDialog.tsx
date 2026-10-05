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
import type { Category } from '../categories/categories-api.ts'
import type { CreditCard } from '../cards/cards-api.ts'
import { useToday } from '../users/use-settings.ts'
import { createPurchase } from './purchases-api.ts'

const purchaseSchema = z
  .object({
    creditCardId: z.string().min(1, 'Elige la tarjeta'),
    categoryId: z.string().optional(),
    description: z.string().trim().min(1, 'La descripción es obligatoria').max(200, 'Máximo 200 caracteres'),
    amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
    type: z.enum(['REGULAR', 'MSI', 'DEFERRED_INTEREST']),
    months: z.string().optional(),
    annualRatePercent: z.string().optional(),
    commissionMode: z.enum(['NONE', 'UPFRONT', 'PRORATED']),
    commissionAmount: z.number().int().min(0).optional(),
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

type PurchaseForm = z.infer<typeof purchaseSchema>

export function PurchaseFormDialog({
  cards,
  categories,
  open,
  onOpenChange,
  initial,
}: {
  cards: CreditCard[]
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: {
    creditCardId?: string
    amount?: number
    purchaseDate?: string
    type?: 'REGULAR' | 'MSI' | 'DEFERRED_INTEREST'
    months?: string
    annualRatePercent?: string
    recommendationId?: string
  }
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const form = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      creditCardId: initial?.creditCardId ?? cards[0]?.id ?? '',
      categoryId: '',
      description: '',
      amount: initial?.amount,
      purchaseDate: initial?.purchaseDate ?? today,
      type: initial?.type ?? 'REGULAR',
      months: initial?.months ?? '3',
      annualRatePercent: initial?.annualRatePercent ?? '0',
      commissionMode: 'NONE',
      commissionAmount: undefined,
    },
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const commissionMode = useWatch({ control: form.control, name: 'commissionMode' })

  const mutation = useMutation({
    mutationFn: (values: PurchaseForm) =>
      createPurchase({
        creditCardId: values.creditCardId,
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        description: values.description,
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
        ...(values.commissionMode !== 'NONE' && values.commissionAmount
          ? { commissionAmount: values.commissionAmount, commissionMode: values.commissionMode }
          : {}),
        ...(initial?.recommendationId ? { recommendationId: initial.recommendationId } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['ledger'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>
            MSI sin intereses; diferida con amortización francesa más IVA (RN-19/20).
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <SelectField label="Tarjeta" {...form.register('creditCardId')}>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.alias} ····{card.last4}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="amount"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="purchaseAmount"
                    label="Monto"
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
            </div>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Comisión" {...form.register('commissionMode')}>
                <option value="NONE">Sin comisión</option>
                <option value="UPFRONT">Al inicio</option>
                <option value="PRORATED">Prorrateada</option>
              </SelectField>
              {commissionMode !== 'NONE' && (
                <Controller
                  name="commissionAmount"
                  control={form.control}
                  render={({ field }) => (
                    <MoneyInput
                      id="commissionAmount"
                      label="Monto de comisión"
                      valueCents={field.value}
                      onCentsChange={field.onChange}
                    />
                  )}
                />
              )}
            </div>
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Registrando…' : 'Registrar compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
