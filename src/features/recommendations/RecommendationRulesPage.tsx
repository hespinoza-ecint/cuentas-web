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
  removeRuleOverride,
  upsertRuleOverride,
  type RecommendationRule,
} from './recommendations-api.ts'

export function RecommendationRulesPage() {
  const queryClient = useQueryClient()
  const rules = useQuery({ queryKey: ['rules'], queryFn: listRules })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['rules'] })
  }

  const override = useMutation({
    mutationFn: ({ code, input }: { code: string; input: { isEnabled?: boolean; weight?: number } }) =>
      upsertRuleOverride(code, input),
    onSuccess: () => {
      toast('Regla personalizada guardada.')
      invalidate()
    },
  })

  const reset = useMutation({
    mutationFn: removeRuleOverride,
    onSuccess: () => {
      toast('Regla restablecida al valor global.')
      invalidate()
    },
  })

  return (
    <div data-testid="rules-page">
      <PageHeader
        title="Reglas de recomendación"
        description="Ajusta el motor para tu caso; los cambios son solo tuyos"
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={override.error ?? reset.error} />
      </div>

      {rules.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {rules.isError && <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />}

      {rules.data && (
        <ul className="space-y-3" data-testid="rules-list">
          {rules.data.map((rule) => (
            <li key={rule.code}>
              <RuleCard
                rule={rule}
                pending={override.isPending || reset.isPending}
                onSave={(input) => override.mutate({ code: rule.code, input })}
                onReset={() => reset.mutate(rule.code)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RuleCard({
  rule,
  pending,
  onSave,
  onReset,
}: {
  rule: RecommendationRule
  pending: boolean
  onSave: (input: { isEnabled?: boolean; weight?: number }) => void
  onReset: () => void
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
            {rule.isOverridden && <Badge tone="warning">Personalizada</Badge>}
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
              <label htmlFor={`weight-${rule.code}`} className="text-sm text-ink-secondary">
                Peso
              </label>
              <input
                id={`weight-${rule.code}`}
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

          {rule.isOverridden && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={onReset}>
              Restablecer
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
