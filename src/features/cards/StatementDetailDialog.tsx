import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
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
import { getStatement, updateStatement, type CardStatement } from './cards-api.ts'

interface ReportedForm {
  noInterestPaymentReported: number | undefined
  minimumPaymentReported: number | undefined
}

export function StatementDetailDialog({
  cardId,
  statement,
  open,
  onOpenChange,
}: {
  cardId: string
  statement: CardStatement
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const detail = useQuery({
    queryKey: ['statement', cardId, statement.id],
    queryFn: () => getStatement(cardId, statement.id),
  })

  const form = useForm<ReportedForm>({
    defaultValues: {
      noInterestPaymentReported: statement.noInterestPaymentReported ?? undefined,
      minimumPaymentReported: statement.minimumPaymentReported ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ReportedForm) =>
      updateStatement(cardId, statement.id, {
        noInterestPaymentReported: values.noInterestPaymentReported ?? null,
        minimumPaymentReported: values.minimumPaymentReported ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['statements', cardId] })
      void queryClient.invalidateQueries({ queryKey: ['statement', cardId, statement.id] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const effectiveNoInterest =
    statement.noInterestPaymentReported ?? statement.noInterestPaymentCalc

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          Corte {formatLocalDate(statement.cutDate)}
        </DialogTitle>
        <DialogDescription>
          Vence {formatLocalDate(statement.dueDate)} · <StatusBadge status={statement.status} />
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <dl className="space-y-2 text-sm">
            <Row label="Saldo al corte" value={<MoneyDisplay cents={statement.statementBalance} className="font-medium" />} />
            <Row label="Cargos del periodo" value={<MoneyDisplay cents={statement.cycleCharges} className="font-medium" />} />
            <Row
              label="Pago para no generar intereses"
              value={<MoneyDisplay cents={effectiveNoInterest} className="font-medium" />}
            />
            <Row
              label="Pago mínimo"
              value={
                <MoneyDisplay
                  cents={statement.minimumPaymentReported ?? statement.minimumPaymentEstimated}
                  className="font-medium"
                />
              }
            />
            <Row label="Pagado" value={<MoneyDisplay cents={statement.paidAmount} className="font-medium" />} />
            {statement.estimatedInterest !== undefined && statement.estimatedInterest > 0 && (
              <Row
                label={`Interés estimado (${statement.estimatedInterestDays ?? 0} días)`}
                value={<MoneyDisplay cents={statement.estimatedInterest} colored className="font-medium" />}
              />
            )}
          </dl>

          {detail.isPending && <Skeleton className="h-20" />}
          {detail.isError && (
            <ErrorAlert error={detail.error} />
          )}
          {detail.data && detail.data.allocations.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Pagos aplicados</p>
              <ul className="space-y-1 text-xs text-slate-600">
                {detail.data.allocations.map((allocation, index) => (
                  <li key={`${allocation.targetType}-${index}`} className="flex justify-between gap-3">
                    <span>
                      {allocation.targetType === 'INSTALLMENT'
                        ? 'Mensualidad'
                        : allocation.targetType === 'STATEMENT'
                          ? 'Corte'
                          : 'Saldo revolvente'}
                      {allocation.cardPayment
                        ? ` · ${formatLocalDate(allocation.cardPayment.paymentDate)}`
                        : ''}
                    </span>
                    <MoneyDisplay cents={allocation.amount} className="font-medium" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form
            className="space-y-3 border-t border-slate-100 pt-3"
            noValidate
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <p className="text-sm font-medium text-slate-700">Montos reportados por el banco</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Controller
                name="noInterestPaymentReported"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="noInterestPaymentReported"
                    label="Pago para no generar intereses"
                    valueCents={field.value}
                    onCentsChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="minimumPaymentReported"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="minimumPaymentReported"
                    label="Pago mínimo"
                    valueCents={field.value}
                    onCentsChange={field.onChange}
                  />
                )}
              />
            </div>
            <ErrorAlert error={mutation.error} />
            {mutation.isSuccess && <SuccessAlert message="Montos del corte actualizados." />}
            <Button type="submit" size="sm" variant="secondary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : 'Guardar montos'}
            </Button>
          </form>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
