import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
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
import type { CashAccount } from '../accounts/accounts-api.ts'
import type { CreditCard } from '../cards/cards-api.ts'
import { useToday } from '../users/use-settings.ts'
import { createPayment, type PaymentAllocation } from './card-payments-api.ts'

const paymentSchema = z.object({
  creditCardId: z.string().min(1, 'Elige la tarjeta'),
  cashAccountId: z.string().min(1, 'Elige la cuenta'),
  amount: z.number({ message: 'Captura el monto' }).int().min(1, 'El monto debe ser mayor a cero'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha'),
  notes: z.string().trim().max(300, 'Máximo 300 caracteres').optional(),
})

type PaymentForm = z.infer<typeof paymentSchema>

export function PaymentFormDialog({
  cards,
  accounts,
  defaultCardId,
  open,
  onOpenChange,
  onCreated,
}: {
  cards: CreditCard[]
  accounts: CashAccount[]
  defaultCardId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (allocations: PaymentAllocation[]) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const selectedCardId = defaultCardId ?? cards[0]?.id ?? ''
  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      creditCardId: selectedCardId,
      cashAccountId: accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? '',
      amount: undefined,
      paymentDate: today,
      notes: '',
    },
  })

  const watchedCardId = useWatch({ control: form.control, name: 'creditCardId' })
  const watchedCard = cards.find((card) => card.id === watchedCardId)

  const mutation = useMutation({
    mutationFn: (values: PaymentForm) =>
      createPayment({
        creditCardId: values.creditCardId,
        cashAccountId: values.cashAccountId,
        amount: values.amount,
        paymentDate: values.paymentDate,
        ...(values.notes ? { notes: values.notes } : {}),
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['card'] })
      void queryClient.invalidateQueries({ queryKey: ['statements'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onCreated?.(result.allocations)
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Se aplica primero a mensualidades exigibles, luego al corte y al saldo revolvente (RN-23).
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <SelectField label="Tarjeta" {...form.register('creditCardId')}>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.alias} ····{card.last4}
                </option>
              ))}
            </SelectField>
            {watchedCard && (
              <p className="text-xs text-ink-muted">
                Saldo actual <MoneyDisplay cents={watchedCard.currentBalance} className="font-medium" /> ·
                disponible <MoneyDisplay cents={watchedCard.availableCredit} className="font-medium" />
              </p>
            )}
            <SelectField label="Cuenta de origen" {...form.register('cashAccountId')}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="paymentAmount"
                  label="Monto"
                  valueCents={field.value}
                  onCentsChange={field.onChange}
                  error={form.formState.errors.amount?.message}
                />
              )}
            />
            <Field
              label="Fecha de pago"
              type="date"
              max={today}
              error={form.formState.errors.paymentDate?.message}
              {...form.register('paymentDate')}
            />
            <Field label="Notas (opcional)" {...form.register('notes')} />
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Aplicando…' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
