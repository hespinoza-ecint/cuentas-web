import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import type { CashAccount } from '../accounts/accounts-api.ts'
import { useToday } from '../users/use-settings.ts'
import { getPurchase, prepayPlan, type Purchase } from './purchases-api.ts'

interface PrepayForm {
  cashAccountId: string
  amount: number | undefined
  paymentDate: string
}

export function PurchaseDetailDialog({
  purchaseId,
  accounts,
  open,
  onOpenChange,
  onCancelRequest,
}: {
  purchaseId: string
  accounts: CashAccount[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelRequest?: (purchase: Purchase) => void
}) {
  const queryClient = useQueryClient()
  const today = useToday()

  const purchase = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => getPurchase(purchaseId),
  })

  const plan = purchase.data?.installmentPlan ?? null
  const nextInstallment = plan?.installments.find((installment) => installment.status !== 'PAID')

  const form = useForm<PrepayForm>({
    defaultValues: {
      cashAccountId: accounts[0]?.id ?? '',
      amount: undefined,
      paymentDate: today,
    },
  })

  const prepay = useMutation({
    mutationFn: (values: PrepayForm) =>
      prepayPlan(plan?.id as string, {
        cashAccountId: values.cashAccountId,
        amount: values.amount as number,
        paymentDate: values.paymentDate,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] })
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['statements'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      form.reset({ cashAccountId: form.getValues('cashAccountId'), amount: undefined, paymentDate: today })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>Detalle de la compra</DialogTitle>
        <DialogDescription>
          {purchase.data
            ? `${purchase.data.description} · ${purchase.data.creditCard?.alias ?? 'tarjeta'} · ${formatLocalDate(purchase.data.purchaseDate)}`
            : 'Cargando…'}
        </DialogDescription>

        {purchase.isPending && <Skeleton className="mt-4 h-24" />}
        {purchase.isError && <ErrorAlert error={purchase.error} className="mt-4" />}

        {purchase.data && (
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <StatusBadge status={purchase.data.status} />
                {plan && (
                  <span className="text-xs text-slate-500">
                    {plan.type === 'MSI' ? `${plan.months} MSI` : `Diferida a ${plan.months} meses`}
                  </span>
                )}
              </span>
              <MoneyDisplay cents={purchase.data.amount} className="font-semibold" />
            </div>

            {plan && (
              <>
                <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    Principal pendiente:{' '}
                    <MoneyDisplay cents={plan.outstandingPrincipal} className="font-medium" />
                  </div>
                  <div>
                    Mensualidad:{' '}
                    <MoneyDisplay cents={plan.estimatedMonthlyPayment} className="font-medium" />
                  </div>
                  {plan.totalInterest > 0 && (
                    <div>
                      Interés total: <MoneyDisplay cents={plan.totalInterest} className="font-medium" />
                    </div>
                  )}
                  {plan.totalIva > 0 && (
                    <div>
                      IVA total: <MoneyDisplay cents={plan.totalIva} className="font-medium" />
                    </div>
                  )}
                </dl>

                <div>
                  <p className="mb-2 font-medium text-slate-700">Mensualidades</p>
                  <ul className="divide-y divide-slate-100" data-testid="installments-list">
                    {plan.installments.map((installment) => (
                      <li key={installment.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                        <span className="text-xs text-slate-500">
                          #{installment.number} · vence {formatLocalDate(installment.dueDate)}
                        </span>
                        <span className="flex items-center gap-2">
                          <MoneyDisplay cents={installment.totalAmount} className="font-medium" />
                          <StatusBadge status={installment.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.status === 'ACTIVE' && plan.outstandingPrincipal > 0 && (
                  <form
                    className="space-y-3 border-t border-slate-100 pt-3"
                    noValidate
                    onSubmit={form.handleSubmit((values) => prepay.mutate(values))}
                  >
                    <p className="font-medium text-slate-700">Anticipo o liquidación</p>
                    {nextInstallment && (
                      <p className="text-xs text-slate-500">
                        Próxima mensualidad #{nextInstallment.number} por{' '}
                        <MoneyDisplay cents={nextInstallment.totalAmount} /> (vence{' '}
                        {formatLocalDate(nextInstallment.dueDate)}).
                      </p>
                    )}
                    <SelectField label="Cuenta de origen" {...form.register('cashAccountId')}>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </SelectField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Controller
                        name="amount"
                        control={form.control}
                        render={({ field }) => (
                          <MoneyInput
                            id="prepayAmount"
                            label="Monto del anticipo"
                            valueCents={field.value}
                            onCentsChange={field.onChange}
                          />
                        )}
                      />
                      <div>
                        <label htmlFor="prepayDate" className="mb-1 block text-sm font-medium text-slate-700">
                          Fecha
                        </label>
                        <input
                          id="prepayDate"
                          type="date"
                          max={today}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          {...form.register('paymentDate')}
                        />
                      </div>
                    </div>
                    <ErrorAlert error={prepay.error} />
                    {prepay.isSuccess && (
                      <SuccessAlert
                        message={
                          prepay.data?.settled
                            ? 'Plan liquidado: la compra quedó pagada.'
                            : 'Anticipo aplicado: se redujo el plazo del plan.'
                        }
                      />
                    )}
                    <Button type="submit" size="sm" disabled={prepay.isPending}>
                      {prepay.isPending ? 'Aplicando…' : 'Aplicar anticipo'}
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {purchase.data?.status === 'ACTIVE' && onCancelRequest && (
            <Button
              variant="danger"
              onClick={() => {
                onCancelRequest(purchase.data as Purchase)
              }}
            >
              Cancelar compra
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
