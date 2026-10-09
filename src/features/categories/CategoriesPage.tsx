import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['categories'] }),
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
              <p className="mt-3 text-sm text-ink-muted">
                Aún no tienes categorías propias. Crea una para clasificar mejor tus movimientos.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line" data-testid="own-categories">
                {own.map((category) => (
                  <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                        <span className="font-medium">{category.name}</span>
                        <Badge tone="neutral">{KIND_LABELS[category.kind] ?? category.kind}</Badge>
                        {category.parentId && (
                          <span className="text-xs text-ink-muted">
                            en {nameById.get(category.parentId) ?? 'categoría'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${category.name}`}
                        onClick={() => setEditing(category)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar ${category.name}`}
                        onClick={() => setDeleting(category)}
                      >
                        <Trash2 className="size-4 text-danger" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
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
