import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import type { RecommendationResult } from './recommendations-api.ts'
import type { ReactNode } from 'react'

const LEVEL_LABELS: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' }> = {
  EXCELLENT: { label: 'Excelente', tone: 'success' },
  GOOD: { label: 'Buena', tone: 'info' },
  FAIR: { label: 'Aceptable', tone: 'warning' },
  NOT_RECOMMENDED: { label: 'No recomendable', tone: 'danger' },
}

export function RecommendationResultView({
  result,
  onRegisterPurchase,
}: {
  result: RecommendationResult
  onRegisterPurchase?: () => void
}) {
  return (
    <div className="space-y-4" data-testid="recommendation-result">
      {result.outcome === 'NONE' && (
        <Card>
          <CardTitle>Ninguna opción recomendada</CardTitle>
          <CardDescription>Estas sugerencias pueden ayudarte a decidir:</CardDescription>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {result.suggestions.map((suggestion) => (
              <li key={suggestion.code}>• {suggestion.message}</li>
            ))}
          </ul>
        </Card>
      )}

      {result.recommended && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Recomendación</CardTitle>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {result.recommended.kind === 'CARD'
                  ? result.recommended.cardAlias
                  : 'Pagar con efectivo'}
              </p>
            </div>
            <div className="text-right">
              <Badge tone={LEVEL_LABELS[result.recommended.level]?.tone ?? 'neutral'}>
                {LEVEL_LABELS[result.recommended.level]?.label ?? result.recommended.level}
              </Badge>
              <p className="mt-1 text-xs text-slate-500">Puntaje {result.recommended.score}/100</p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <Metric label="Días de financiamiento" value={String(result.recommended.financingDays)} />
            <Metric
              label="Costo de intereses"
              value={<MoneyDisplay cents={result.recommended.interestCost} colored />}
            />
            {result.recommended.utilizationBpsAfter !== undefined && (
              <Metric
                label="Utilización resultante"
                value={`${(result.recommended.utilizationBpsAfter / 100).toFixed(1)}%`}
              />
            )}
            <Metric
              label="Flujo mínimo"
              value={<MoneyDisplay cents={result.recommended.minimumProjectedBalance} colored />}
              hint={formatLocalDate(result.recommended.minimumProjectedDate)}
            />
            {result.recommended.cutDate && (
              <Metric label="Corte" value={formatLocalDate(result.recommended.cutDate)} />
            )}
            {result.recommended.dueDate && (
              <Metric label="Pago" value={formatLocalDate(result.recommended.dueDate)} />
            )}
          </dl>

          {result.recommended.reasons.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-slate-600">
              {result.recommended.reasons.map((reason) => (
                <li key={reason.code}>• {reason.message}</li>
              ))}
            </ul>
          )}

          {result.recommended.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-amber-700">
              {result.recommended.warnings.map((warning) => (
                <li key={warning.code}>⚠ {warning.message}</li>
              ))}
            </ul>
          )}

          {result.recommended.paymentPlan.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Plan de pagos</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {result.recommended.paymentPlan.map((entry, index) => (
                  <li key={`${entry.date}-${index}`} className="flex justify-between gap-3">
                    <span>{formatLocalDate(entry.date)}</span>
                    <MoneyDisplay cents={entry.amount} className="font-medium" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onRegisterPurchase && result.outcome === 'CARD' && (
            <div className="mt-4">
              <Button size="sm" onClick={onRegisterPurchase}>
                Registrar compra con esta tarjeta
              </Button>
            </div>
          )}
        </Card>
      )}

      {result.alternatives.length > 0 && (
        <Card>
          <CardTitle>Alternativas</CardTitle>
          <CardDescription>Ordenadas por puntaje</CardDescription>
          <ul className="mt-3 divide-y divide-slate-100" data-testid="recommendation-alternatives">
            {result.alternatives.map((option, index) => (
              <li key={`${option.kind}-${option.cardId ?? 'cash'}-${index}`} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {option.kind === 'CARD' ? option.cardAlias : 'Efectivo'}
                    </span>
                    {option.eligible ? (
                      <Badge tone={LEVEL_LABELS[option.level]?.tone ?? 'neutral'}>
                        {LEVEL_LABELS[option.level]?.label ?? option.level}
                      </Badge>
                    ) : (
                      <Badge tone="danger">Descartada</Badge>
                    )}
                  </span>
                  {option.eligible && <span className="text-xs text-slate-500">Puntaje {option.score}</span>}
                </div>
                {option.eliminatedBy.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                    {option.eliminatedBy.map((finding) => (
                      <li key={finding.code}>{finding.message}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-slate-400 italic">{result.disclaimer}</p>
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
