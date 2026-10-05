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
import { deleteAccount } from '../users/users-api.ts'

const deleteSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
  confirm: z.literal(true, { message: 'Debes confirmar que entiendes la consecuencia' }),
})

type DeleteForm = z.infer<typeof deleteSchema>

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (message: string) => void
}) {
  const form = useForm<DeleteForm>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { password: '', confirm: false as unknown as true },
  })

  const mutation = useMutation({
    mutationFn: (values: DeleteForm) => deleteAccount(values.password),
    onSuccess: (message) => {
      onDeleted(message)
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            La cuenta queda inactiva y se elimina definitivamente en 30 días. Puedes cancelar la
            solicitud iniciando sesión de nuevo.
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
              Entiendo que mi cuenta se eliminará en 30 días y que la cancelación reinicia la
              sesión.
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
              {mutation.isPending ? 'Procesando…' : 'Eliminar cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
