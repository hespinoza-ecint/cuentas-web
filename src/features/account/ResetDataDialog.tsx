import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { resetAccountData, type ResetScope } from '../users/users-api.ts'

const resetSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
  confirm: z.literal(true, { message: 'Debes confirmar que entiendes la consecuencia' }),
})

type ResetForm = z.infer<typeof resetSchema>

const TEXTS: Record<
  ResetScope,
  { title: string; description: string; checkbox: string; submit: string }
> = {
  ALL: {
    title: 'Restablecer datos',
    description:
      'Se eliminarán cuentas, movimientos, ingresos, gastos, recurrentes, tarjetas, cortes, pagos, compras, mensualidades, recomendaciones y categorías propias. Tu cuenta, sesión y preferencias se conservan. Esta acción no se puede deshacer.',
    checkbox: 'Entiendo que se borrarán mis datos financieros y que no se puede deshacer.',
    submit: 'Restablecer datos',
  },
  CARDS: {
    title: 'Restablecer tarjetas',
    description:
      'Se eliminarán tarjetas, libro, estados de cuenta, pagos, compras, planes y mensualidades. Tu efectivo, ingresos, gastos, recurrentes y preferencias se conservan (también los movimientos de efectivo de los pagos de tarjeta). Esta acción no se puede deshacer.',
    checkbox: 'Entiendo que se borrarán mis tarjetas y su historial, y que no se puede deshacer.',
    submit: 'Restablecer tarjetas',
  },
}

export function ResetDataDialog({
  open,
  onOpenChange,
  onReset,
  scope = 'ALL',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: (message: string) => void
  scope?: ResetScope
}) {
  const texts = TEXTS[scope]
  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: false as unknown as true },
  })

  const mutation = useMutation({
    mutationFn: (values: ResetForm) => resetAccountData(values.password, scope),
    onSuccess: (result) => {
      onReset(result.message)
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>{texts.title}</DialogTitle>
          <DialogDescription>{texts.description}</DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <label className="flex items-start gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-line-strong"
                {...form.register('confirm')}
              />
              {texts.checkbox}
            </label>
            {form.formState.errors.confirm && (
              <p role="alert" className="text-xs text-danger">
                {form.formState.errors.confirm.message}
              </p>
            )}
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={mutation.isPending}>
              {mutation.isPending ? 'Borrando…' : texts.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
