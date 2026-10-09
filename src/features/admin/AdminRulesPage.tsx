import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription } from '../../components/ui/card.tsx'
import { controlClass } from '../../components/ui/control.ts'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { Switch } from '../../components/ui/switch.tsx'
import { toast } from '../../lib/toast.ts'
import {
  listRules,
  type RecommendationRule,
} from '../recommendations/recommendations-api.ts'
import { adminUpdateRule } from './admin-api.ts'

export function AdminRulesPage() {
  const queryClient = useQueryClient()
  const rules = useQuery({ queryKey: ['rules'], queryFn: listRules })

  const update = useMutation({
    mutationFn: ({ code, input }: { code: string; input: { isEnabled?: boolean; weight?: number } }) =>
      adminUpdateRule(code, input),
    onSuccess: () => {
      toast('Regla global actualizada para todos los usuarios.')
      void queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })

  return (
    <div data-testid="admin-rules-page">
      <PageHeader
        title="Reglas globales"
        description="Solo administradores: estos valores aplican a todos los usuarios"
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={update.error} />
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
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            {rule.name}
            <Badge tone={rule.kind === 'ELIMINATORY' ? 'danger' : 'info'}>
              {rule.kind === 'ELIMINATORY' ? 'Eliminatoria' : 'Puntaje'}
            </Badge>
          </p>
          <CardDescription>{rule.description}</CardDescription>
          <p className="mt-1 text-xs text-ink-muted">
            {rule.code}
            {Object.keys(rule.params).length > 0 ? ` · ${JSON.stringify(rule.params)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-ink-secondary">
            <Switch
              checked={rule.isEnabled}
              disabled={pending}
              label={`${rule.name}: activa`}
              onCheckedChange={(checked) => onSave({ isEnabled: checked })}
            />
            Activa
          </span>

          {rule.kind === 'SCORING' && (
            <div className="flex items-center gap-2">
              <label htmlFor={`admin-weight-${rule.code}`} className="text-sm text-ink-secondary">
                Peso
              </label>
              <input
                id={`admin-weight-${rule.code}`}
                inputMode="numeric"
                value={weight}
                disabled={pending}
                onChange={(event) => setWeight(event.target.value)}
                className={controlClass({ className: 'w-16 px-2 py-1 text-sm' })}
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
