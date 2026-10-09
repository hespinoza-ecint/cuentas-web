import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { toast } from '../../lib/toast.ts'
import { createCategory, updateCategory, type Category } from './categories-api.ts'

const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  kind: z.enum(['EXPENSE', 'INCOME', 'BOTH']),
  parentId: z.string().optional(),
  icon: z.string().trim().max(40, 'Máximo 40 caracteres').optional(),
})

type CategoryForm = z.infer<typeof categorySchema>

export function CategoryFormDialog({
  open,
  onOpenChange,
  categories,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  editing?: Category | null
}) {
  const queryClient = useQueryClient()

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: editing?.name ?? '',
      kind: (editing?.kind as CategoryForm['kind']) ?? 'EXPENSE',
      parentId: editing?.parentId ?? '',
      icon: editing?.icon ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CategoryForm) => {
      const payload = {
        name: values.name,
        kind: values.kind,
        parentId: values.parentId ? values.parentId : null,
        icon: values.icon || undefined,
      }
      return editing ? updateCategory(editing.id, payload) : createCategory(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast(editing ? 'Cambios de la categoría guardados.' : 'Categoría creada.')
      onOpenChange(false)
    },
  })

  const parentOptions = categories.filter(
    (category) => category.parentId === null && category.id !== editing?.id,
  )

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={form.formState.isDirty}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            Las categorías propias se suman a las del sistema. Solo admite un nivel de anidación.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <Field
              label="Nombre"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <SelectField label="Tipo" {...form.register('kind')}>
              <option value="EXPENSE">Gasto</option>
              <option value="INCOME">Ingreso</option>
              <option value="BOTH">Ambos</option>
            </SelectField>
            <SelectField label="Categoría padre (opcional)" {...form.register('parentId')}>
              <option value="">Sin padre</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isSystem ? ' (sistema)' : ''}
                </option>
              ))}
            </SelectField>
            <Field
              label="Ícono (opcional)"
              placeholder="paw"
              error={form.formState.errors.icon?.message}
              {...form.register('icon')}
            />
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
