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
import { resetAccountData } from '../users/users-api.ts'

const resetSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
  confirm: z.literal(true, { message: 'Debes confirmar que entiendes la consecuencia' }),
})

type ResetForm = z.infer<typeof resetSchema>

export function ResetDataDialog({
  open,
  onOpenChange,
  onReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: (message: string) => void
}) {
  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: false as unknown as true },
  })

  const mutation = useMutation({
    mutationFn: (values: ResetForm) => resetAccountData(values.password),
    onSuccess: (result) => {
      onReset(result.message)
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Restablecer datos</DialogTitle>
          <DialogDescription>
            Se eliminarán cuentas, movimientos, ingresos, gastos, recurrentes, tarjetas, cortes,
            pagos, compras, mensualidades, recomendaciones y categorías propias. Tu cuenta, sesión y
            preferencias se conservan. Esta acción no se puede deshacer.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-slate-300"
                {...form.register('confirm')}
              />
              Entiendo que se borrarán mis datos financieros y que no se puede deshacer.
            </label>
            {form.formState.errors.confirm && (
              <p role="alert" className="text-xs text-red-600">
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
              {mutation.isPending ? 'Borrando…' : 'Restablecer datos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
