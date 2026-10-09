import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { ListRow } from '../../components/ui/list-row.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { toast } from '../../lib/toast.ts'
import { CategoryFormDialog } from './CategoryFormDialog.tsx'
import { listCategories, removeCategory, type Category } from './categories-api.ts'

const KIND_LABELS: Record<string, string> = {
  EXPENSE: 'Gasto',
  INCOME: 'Ingreso',
  BOTH: 'Ambos',
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() })

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const remove = useMutation({
    mutationFn: removeCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast('Categoría eliminada.')
    },
  })

  const all = categories.data ?? []
  const own = all.filter((category) => !category.isSystem)
  const system = all.filter((category) => category.isSystem)
  const nameById = new Map(all.map((category) => [category.id, category.name]))

  return (
    <div data-testid="categories-page">
      <PageHeader
        title="Categorías"
        description="Las del sistema vienen listas; puedes crear las tuyas propias"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva categoría
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={remove.error} />
      </div>

      {categories.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {categories.isError && (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      )}

      {categories.data && (
        <div className="space-y-5">
          <Card>
            <CardTitle>Tus categorías ({own.length})</CardTitle>
            <CardDescription>Se pueden editar y eliminar; las usan tus registros.</CardDescription>
            {own.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="Aún no tienes categorías propias"
                  description="Crea una para clasificar mejor tus movimientos."
                  action={
                    <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                      Nueva categoría
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="own-categories">
                {own.map((category) => (
                  <ListRow
                    key={category.id}
                    onOpen={() => setEditing(category)}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {category.name}
                        <Badge tone="neutral">{KIND_LABELS[category.kind] ?? category.kind}</Badge>
                      </span>
                    }
                    subtitle={
                      category.parentId
                        ? `Dentro de ${nameById.get(category.parentId) ?? 'categoría'}`
                        : undefined
                    }
                    menu={[
                      { label: 'Editar', icon: Pencil, onSelect: () => setEditing(category) },
                      {
                        label: 'Eliminar',
                        icon: Trash2,
                        tone: 'danger',
                        onSelect: () => setDeleting(category),
                      },
                    ]}
                    menuLabel={`Más acciones de ${category.name}`}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle>Categorías del sistema ({system.length})</CardTitle>
            <CardDescription>Son de solo lectura y están disponibles para todos.</CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              {system.map((category) => (
                <Badge key={category.id} tone="neutral">
                  {category.name}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} categories={all} />
      {editing && (
        <CategoryFormDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
            }
          }}
          categories={all}
          editing={editing}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
          }
        }}
        title="Eliminar categoría"
        description={
          deleting
            ? `Se ocultará "${deleting.name}". No se puede eliminar si tiene subcategorías activas.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleting) {
            await remove.mutateAsync(deleting.id)
          }
        }}
      />
    </div>
  )
}
