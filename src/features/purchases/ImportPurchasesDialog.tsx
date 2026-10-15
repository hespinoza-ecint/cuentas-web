import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Checkbox } from '../../components/ui/checkbox.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import { newIdempotencyKey } from '../../lib/idempotency.ts'
import { invalidateFinancial } from '../../lib/invalidate-financial.ts'
import { formatCents } from '../../lib/money.ts'
import { toast } from '../../lib/toast.ts'
import type { CreditCard } from '../cards/cards-api.ts'
import { readPurchasesFile } from './import/read-purchases-file.ts'
import type { ParsedPurchaseRow } from './import/parse-purchase-rows.ts'
import {
  importPurchases,
  previewPurchaseImport,
  type ImportPreviewRow,
  type ImportPurchaseRowInput,
} from './purchases-api.ts'

interface ImportRowState {
  parsed: ParsedPurchaseRow
  /** Descripcion final; se puede corregir durante la revision. */
  description: string
  included: boolean
  /** Ya hubo una decision explicita: la vista previa no la pisa. */
  decided: boolean
  preview: ImportPreviewRow | null
}

export function ImportPurchasesDialog({
  cards,
  open,
  onOpenChange,
}: {
  cards: CreditCard[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [cardId, setCardId] = useState(cards[0]?.id ?? '')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRowState[] | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<unknown>(null)
  const [previewing, setPreviewing] = useState(false)
  /** Posicion dentro de las filas revisables; null = vista de tabla. */
  const [reviewPosition, setReviewPosition] = useState<number | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const idempotencyKey = useRef(newIdempotencyKey())

  const importableIndexes = (rows ?? [])
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isBlocked(row))
    .map(({ index }) => index)
  const selected = (rows ?? []).filter((row) => row.included && !isBlocked(row))
  const selectedTotal = selected.reduce((total, row) => total + (row.parsed.amount ?? 0), 0)
  /** Una descripcion vacia no puede viajar a la API (RN-31): se bloquea aqui. */
  const blankDescription = selected.some((row) => row.description.trim() === '')
  const reviewing = reviewPosition !== null
  const currentIndex = reviewing ? importableIndexes[reviewPosition] : null
  const current = currentIndex !== null && rows ? rows[currentIndex] : null

  function toInput(row: ImportRowState): ImportPurchaseRowInput | null {
    if (row.parsed.error || !row.parsed.purchaseDate || !row.parsed.amount) {
      return null
    }
    return {
      purchaseDate: row.parsed.purchaseDate,
      description: row.description.trim(),
      amount: row.parsed.amount,
    }
  }

  /** Vuelve a pedir los avisos; nunca pisa decisiones del usuario. */
  async function refreshPreview(nextRows: ImportRowState[], targetCardId: string) {
    const indexes: number[] = []
    const body: ImportPurchaseRowInput[] = []
    nextRows.forEach((row, index) => {
      const input = toInput(row)
      if (input) {
        indexes.push(index)
        body.push(input)
      }
    })
    if (body.length === 0) {
      return
    }
    setPreviewing(true)
    setPreviewError(null)
    try {
      const result = await previewPurchaseImport({ creditCardId: targetCardId, rows: body })
      setRows(
        (current) =>
          (current ?? []).map((row, index) => {
            const position = indexes.indexOf(index)
            if (position < 0) {
              return row
            }
            return applyPreview(row, result[position] ?? null)
          }),
      )
    } catch (error) {
      setPreviewError(error)
    } finally {
      setPreviewing(false)
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setFileName(file.name)
    setFileError(null)
    setPreviewError(null)
    importMutation.reset()
    setDescriptionError(null)
    setReviewPosition(null)
    const parsed = await readPurchasesFile(file)
    if (parsed.error) {
      setRows(null)
      setFileError(parsed.error)
      return
    }
    const initial: ImportRowState[] = parsed.rows.map((row) => ({
      parsed: row,
      description: row.description ?? '',
      included: false,
      decided: false,
      preview: null,
    }))
    setRows(initial)
    await refreshPreview(initial, cardId)
  }

  function onCardChange(nextCardId: string) {
    setCardId(nextCardId)
    if (rows) {
      void refreshPreview(rows, nextCardId)
    }
  }

  function setIncluded(index: number, included: boolean) {
    setRows((current) =>
      (current ?? []).map((row, i) => (i === index ? { ...row, included, decided: true } : row)),
    )
  }

  function setAll(included: boolean) {
    setRows((current) =>
      (current ?? []).map((row) => (isBlocked(row) ? row : { ...row, included, decided: true })),
    )
  }

  function updateDescription(index: number, description: string) {
    setRows((current) =>
      (current ?? []).map((row, i) => (i === index ? { ...row, description } : row)),
    )
  }

  /** Incluye la compra en revision (con la descripcion corregida) y avanza. */
  async function includeCurrent() {
    if (currentIndex === null || !rows) {
      return
    }
    const row = rows[currentIndex]
    const description = row.description.trim()
    if (!description) {
      setDescriptionError('La descripcion es obligatoria.')
      return
    }
    setDescriptionError(null)
    const edited = description !== (row.parsed.description ?? '')
    const nextRows = rows.map((item, index) =>
      index === currentIndex ? { ...item, description, included: true, decided: true } : item,
    )
    setRows(nextRows)
    if (edited) {
      await refreshPreview(nextRows, cardId)
    }
    advanceReview()
  }

  function skipCurrent() {
    if (currentIndex === null) {
      return
    }
    setIncluded(currentIndex, false)
    advanceReview()
  }

  function advanceReview() {
    if (reviewPosition === null) {
      return
    }
    if (reviewPosition + 1 >= importableIndexes.length) {
      setReviewPosition(null)
      return
    }
    setReviewPosition(reviewPosition + 1)
  }

  const importMutation = useMutation({
    mutationFn: () => {
      const body: ImportPurchaseRowInput[] = []
      for (const row of selected) {
        const input = toInput(row)
        if (input) {
          body.push(input)
        }
      }
      return importPurchases({ creditCardId: cardId, rows: body }, idempotencyKey.current)
    },
    onSuccess: (result) => {
      idempotencyKey.current = newIdempotencyKey()
      invalidateFinancial(queryClient)
      toast(
        result.createdCount === 1
          ? 'Se importó 1 compra.'
          : `Se importaron ${result.createdCount} compras.`,
      )
      onOpenChange(false)
    },
  })

  const dirty = (rows ?? []).some(
    (row) => row.decided || row.description.trim() !== (row.parsed.description ?? ''),
  )

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selected.length > 0 && !previewing && !blankDescription) {
      importMutation.mutate()
    }
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={dirty} className="sm:max-w-2xl">
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>Importar compras desde Excel</DialogTitle>
        <DialogDescription>
          Elige la tarjeta y el archivo; revisa la vista previa antes de importar.
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Tarjeta"
              value={cardId}
              onChange={(event) => onCardChange(event.target.value)}
            >
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.alias} ····{card.last4}
                </option>
              ))}
            </SelectField>
            <Field
              label="Archivo Excel"
              type="file"
              accept=".xlsx"
              onChange={(event) => void onFileChange(event)}
            />
          </div>

          {fileName && <p className="text-xs text-ink-muted">Archivo: {fileName}</p>}

          <ErrorAlert
            error={
              fileError ??
              previewError ??
              (blankDescription
                ? 'Completa la descripción de las compras marcadas antes de importar.'
                : null) ??
              importMutation.error
            }
          />

          {rows && !reviewing && (
            <div data-testid="import-preview">
              {previewing && <p className="text-sm text-ink-muted">Revisando la lista…</p>}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink-secondary">
                  {selected.length === 1 ? '1 compra' : `${selected.length} compras`} · total{' '}
                  {formatCents(selectedTotal)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setAll(true)}>
                    Marcar todas
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setAll(false)}>
                    Marcar ninguna
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={importableIndexes.length === 0 || previewing}
                    onClick={() => setReviewPosition(0)}
                  >
                    Revisar una por una
                  </Button>
                </div>
              </div>

              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
                {rows.map((row, index) => (
                  <li key={row.parsed.line} className="rounded-xl border border-line px-3 py-1.5">
                    <Checkbox
                      alignTop
                      aria-label={`Incluir ${row.description || `fila ${row.parsed.line}`}`}
                      checked={row.included}
                      disabled={isBlocked(row)}
                      onChange={(event) => setIncluded(index, event.target.checked)}
                      label={
                        <span className="block">
                          <span className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate font-medium text-ink">
                              {row.parsed.description ?? `Línea ${row.parsed.line}`}
                            </span>
                            {row.parsed.amount !== undefined && (
                              <MoneyDisplay cents={row.parsed.amount} />
                            )}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            {row.parsed.purchaseDate ? formatLocalDate(row.parsed.purchaseDate) : ''}
                            {row.description !== (row.parsed.description ?? '') &&
                              ` · se importará como "${row.description}"`}
                          </span>
                          {noticesFor(row).map((notice) => (
                            <span key={notice} className="mt-0.5 block text-xs text-warning-ink">
                              {notice}
                            </span>
                          ))}
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rows && reviewing && current && (
            <div data-testid="import-review" className="space-y-3">
              <p className="text-sm text-ink-secondary">
                Compra {reviewPosition + 1} de {importableIndexes.length} · {selected.length}{' '}
                incluidas
              </p>
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">
                    {current.parsed.purchaseDate
                      ? formatLocalDate(current.parsed.purchaseDate)
                      : ''}
                  </span>
                  {current.parsed.amount !== undefined && (
                    <MoneyDisplay cents={current.parsed.amount} className="font-semibold" />
                  )}
                </div>
                <div className="mt-3">
                  <Field
                    label="Descripción"
                    value={current.description}
                    maxLength={200}
                    error={descriptionError ?? undefined}
                    onChange={(event) =>
                      updateDescription(currentIndex as number, event.target.value)
                    }
                  />
                </div>
                {noticesFor(current).map((notice) => (
                  <p key={notice} className="mt-2 text-xs text-warning-ink">
                    {notice}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={reviewPosition === 0}
                  onClick={() => setReviewPosition(Math.max(0, (reviewPosition ?? 0) - 1))}
                >
                  Anterior
                </Button>
                <Button type="button" variant="secondary" onClick={skipCurrent}>
                  Omitir
                </Button>
                <Button type="button" onClick={() => void includeCurrent()}>
                  Incluir
                </Button>
                <Button type="button" variant="ghost" onClick={() => setReviewPosition(null)}>
                  Volver a la tabla
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <SubmitButton
            pending={importMutation.isPending}
            disabled={selected.length === 0 || previewing || blankDescription}
          >
            {selected.length === 1 ? 'Importar 1 compra' : `Importar ${selected.length} compras`}
          </SubmitButton>
        </DialogFooter>
      </form>
    </FormDialog>
  )
}

/** Filas con error de lectura o fecha fuera de rango: no se pueden importar. */
function isBlocked(row: ImportRowState): boolean {
  return Boolean(row.parsed.error) || row.preview?.dateIssue != null
}

/** Avisos de una fila, listos para mostrar. */
function noticesFor(row: ImportRowState): string[] {
  const notices: string[] = []
  if (row.parsed.error) {
    notices.push(row.parsed.error)
  }
  if (row.preview?.dateIssue === 'FUTURE_DATE_NOT_ALLOWED') {
    notices.push('La fecha es futura: no se puede registrar.')
  } else if (row.preview?.dateIssue === 'BACKDATE_LIMIT_EXCEEDED') {
    notices.push('La fecha es anterior al límite permitido.')
  }
  if (row.preview?.duplicateOfId) {
    notices.push('Posible duplicado: ya existe una compra igual en esta tarjeta.')
  }
  if (row.preview?.statementPaid) {
    notices.push('Corte pagado: no se podrá eliminar después.')
  }
  return notices
}

/** Copia la respuesta del preview sin pisar decisiones ya tomadas. */
function applyPreview(row: ImportRowState, preview: ImportPreviewRow | null): ImportRowState {
  const next = { ...row, preview }
  if (!row.decided) {
    next.included = !isBlocked(next) && !preview?.duplicateOfId && !preview?.statementPaid
  }
  return next
}
