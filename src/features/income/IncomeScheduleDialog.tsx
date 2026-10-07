import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { MoneyInput } from '../../components/shared/MoneyInput.tsx'
import { ScheduleEditor } from '../../components/shared/ScheduleEditor.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import {
  emptyScheduleValue,
  scheduleValueFrom,
  scheduleValueToPayload,
  validateSchedule,
  type ScheduleFormValue,
} from '../../lib/schedule-form.ts'
import { useToday } from '../users/use-settings.ts'
import {
  addSchedule,
  updateSchedule,
  type IncomeSchedule,
  type IncomeSource,
} from './income-api.ts'

interface AmountForm {
  amountOverride: number | undefined
  isActive: boolean
}

export function IncomeScheduleDialog({
  source,
  open,
  onOpenChange,
  editing,
}: {
  source: IncomeSource
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: IncomeSchedule | null
}) {
  const queryClient = useQueryClient()
  const today = useToday()
  const [schedule, setSchedule] = useState<ScheduleFormValue>(() =>
    editing ? scheduleValueFrom(editing) : emptyScheduleValue(today),
  )
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const form = useForm<AmountForm>({
    defaultValues: {
      amountOverride: editing?.amountOverride ?? undefined,
      isActive: editing?.isActive ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload = scheduleValueToPayload(schedule)
      const override = form.getValues('amountOverride')
      const input = {
        ...payload,
        ...(override !== undefined ? { amountOverride: override } : {}),
      }
      return editing
        ? updateSchedule(source.id, editing.id, { ...input, isActive: form.getValues('isActive') })
        : addSchedule(source.id, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      void queryClient.invalidateQueries({ queryKey: ['income-upcoming'] })
      onOpenChange(false)
    },
  })

  function handleSubmit() {
    const error = validateSchedule(schedule)
    setScheduleError(error)
    if (!error) {
      mutation.mutate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{editing ? 'Editar calendario' : 'Agregar calendario'}</DialogTitle>
        <DialogDescription>{source.name}</DialogDescription>

        <div className="mt-4 space-y-4">
          <ScheduleEditor
            value={schedule}
            onChange={setSchedule}
            error={scheduleError ?? undefined}
            lockFrequency={Boolean(editing)}
          />

          <Controller
            name="amountOverride"
            control={form.control}
            render={({ field }) => (
              <MoneyInput
                id="amountOverride"
                label="Monto para este calendario (opcional)"
                valueCents={field.value}
                onCentsChange={field.onChange}
              />
            )}
          />

          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                {...form.register('isActive')}
              />
              Calendario activo
            </label>
          )}
        </div>

        <ErrorAlert error={mutation.error} className="mt-4" />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : editing ? 'Guardar calendario' : 'Agregar calendario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
