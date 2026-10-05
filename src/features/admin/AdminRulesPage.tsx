import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription } from '../../components/ui/card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import {
  listRules,
  type RecommendationRule,
} from '../recommendations/recommendations-api.ts'
import { adminUpdateRule } from './admin-api.ts'

export function AdminRulesPage() {
  const queryClient = useQueryClient()
  const rules = useQuery({ queryKey: ['rules'], queryFn: listRules })
  const [notice, setNotice] = useState<string | null>(null)

  const update = useMutation({
    mutationFn: ({ code, input }: { code: string; input: { isEnabled?: boolean; weight?: number } }) =>
      adminUpdateRule(code, input),
    onSuccess: () => {
      setNotice('Regla global actualizada para todos los usuarios.')
      void queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })

  return (
    <div data-testid="admin-rules-page">
      <PageHeader
        title="Reglas globales"
        description="Solo administradores: estos valores aplican a todos los usuarios sin override propio"
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={update.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

      {rules.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {rules.isError && <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />}

      {rules.data && (
        <ul className="space-y-3" data-testid="admin-rules-list">
          {rules.data.map((rule) => (
            <li key={rule.code}>
              <AdminRuleCard
                rule={rule}
                pending={update.isPending}
                onSave={(input) => update.mutate({ code: rule.code, input })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AdminRuleCard({
  rule,
  pending,
  onSave,
}: {
  rule: RecommendationRule
  pending: boolean
  onSave: (input: { isEnabled?: boolean; weight?: number }) => void
}) {
  const [weight, setWeight] = useState(String(rule.weight))

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
            {rule.name}
            <Badge tone={rule.kind === 'ELIMINATORY' ? 'danger' : 'info'}>
              {rule.kind === 'ELIMINATORY' ? 'Eliminatoria' : 'Puntaje'}
            </Badge>
          </p>
          <CardDescription>{rule.description}</CardDescription>
          <p className="mt-1 text-xs text-slate-400">
            {rule.code}
            {Object.keys(rule.params).length > 0 ? ` · ${JSON.stringify(rule.params)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300"
              checked={rule.isEnabled}
              disabled={pending}
              onChange={(event) => onSave({ isEnabled: event.target.checked })}
            />
            Activa
          </label>

          {rule.kind === 'SCORING' && (
            <div className="flex items-center gap-2">
              <label htmlFor={`admin-weight-${rule.code}`} className="text-sm text-slate-700">
                Peso
              </label>
              <input
                id={`admin-weight-${rule.code}`}
                inputMode="numeric"
                value={weight}
                disabled={pending}
                onChange={(event) => setWeight(event.target.value)}
                className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={pending || !/^\d+$/.test(weight)}
                onClick={() => onSave({ weight: Number(weight) })}
              >
                Guardar peso
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
