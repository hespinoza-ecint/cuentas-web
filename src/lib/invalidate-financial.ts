import type { QueryClient } from '@tanstack/react-query'

/**
 * Refresca las colecciones que dependen del dinero tras una mutación
 * financiera (gastos, ingresos, pagos, compras, ajustes, transferencias,
 * recurrentes). Las invalidaciones específicas de cada diálogo se conservan;
 * React Query colapsa las claves repetidas.
 */
export function invalidateFinancial(queryClient: QueryClient): void {
  for (const key of [
    'cashflow',
    'dashboard',
    'accounts',
    'movements',
    'expenses',
    'income-sources',
    'income-upcoming',
    'income-transactions',
    'purchases',
    'purchase',
    'cards',
    'card',
    'cycle',
    'statements',
    'payments',
    'ledger',
    'recurring-upcoming',
    'recurring-expenses',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}
