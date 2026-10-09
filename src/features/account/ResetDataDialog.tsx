import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { PasswordField } from '../../components/shared/PasswordField.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Checkbox } from '../../components/ui/checkbox.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
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
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={form.formState.isDirty}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>{texts.title}</DialogTitle>
          <DialogDescription>{texts.description}</DialogDescription>

          <div className="mt-4 space-y-4">
            <PasswordField
              label="Contraseña"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <div>
              <Checkbox alignTop label={texts.checkbox} {...form.register('confirm')} />
              {form.formState.errors.confirm && (
                <p role="alert" className="text-xs text-danger">
                  {form.formState.errors.confirm.message}
                </p>
              )}
            </div>
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending} variant="danger" pendingLabel="Borrando…">
              {texts.submit}
            </SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
