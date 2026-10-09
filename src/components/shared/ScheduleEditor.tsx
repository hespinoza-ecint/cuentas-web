import type {
  CustomMode,
  Frequency,
  NonBusinessDayRule,
  ScheduleFormValue,
} from '../../lib/schedule-form.ts'
import { Field } from './Field.tsx'
import { SelectField } from './SelectField.tsx'
import { Checkbox } from '../ui/checkbox.tsx'

const WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface ScheduleEditorProps {
  value: ScheduleFormValue
  onChange: (value: ScheduleFormValue) => void
  error?: string
  /** En edición no se cambia la frecuencia, solo su configuración. */
  lockFrequency?: boolean
}

export function ScheduleEditor({ value, onChange, error, lockFrequency = false }: ScheduleEditorProps) {
  function update(patch: Partial<ScheduleFormValue>) {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface-subtle p-4">
      <SelectField
        label="Frecuencia"
        value={value.frequency}
        disabled={lockFrequency}
        onChange={(event) => update({ frequency: event.target.value as Frequency })}
      >
        <option value="MONTHLY">Mensual</option>
        <option value="BIWEEKLY">Quincenal</option>
        <option value="WEEKLY">Semanal</option>
        <option value="CUSTOM">Personalizada</option>
        <option value="ONE_TIME">Única</option>
      </SelectField>

      {value.frequency === 'WEEKLY' && (
        <SelectField
          label="Día de la semana"
          value={value.dayOfWeek}
          onChange={(event) => update({ dayOfWeek: event.target.value })}
        >
          {WEEK_DAYS.map((day, index) => (
            <option key={day} value={String(index)}>
              {day}
            </option>
          ))}
        </SelectField>
      )}

      {value.frequency === 'BIWEEKLY' && (
        <Field
          label="Días de pago"
          hint="Separados por coma. Ejemplo: 15, ULTIMO"
          value={value.biweeklyDays}
          onChange={(event) => update({ biweeklyDays: event.target.value })}
        />
      )}

      {value.frequency === 'MONTHLY' && (
        <Field
          label="Día del mes"
          hint="1 a 31, o ULTIMO"
          value={value.monthlyDay}
          onChange={(event) => update({ monthlyDay: event.target.value })}
        />
      )}

      {value.frequency === 'CUSTOM' && (
        <>
          <SelectField
            label="Modalidad"
            value={value.customMode}
            onChange={(event) => update({ customMode: event.target.value as CustomMode })}
          >
            <option value="everyNDays">Cada N días</option>
            <option value="daysOfMonth">Días del mes</option>
            <option value="specificDates">Fechas específicas</option>
          </SelectField>
          {value.customMode === 'everyNDays' && (
            <Field
              label="Cada N días"
              inputMode="numeric"
              value={value.everyNDays}
              onChange={(event) => update({ everyNDays: event.target.value })}
            />
          )}
          {value.customMode === 'daysOfMonth' && (
            <Field
              label="Días del mes"
              hint="Separados por coma. Ejemplo: 1, 15"
              value={value.daysOfMonth}
              onChange={(event) => update({ daysOfMonth: event.target.value })}
            />
          )}
          {value.customMode === 'specificDates' && (
            <Field
              label="Fechas específicas"
              hint="YYYY-MM-DD separadas por coma"
              value={value.specificDates}
              onChange={(event) => update({ specificDates: event.target.value })}
            />
          )}
        </>
      )}

      {value.frequency === 'ONE_TIME' && (
        <Field
          label="Fecha única"
          type="date"
          value={value.specificDates}
          onChange={(event) => update({ specificDates: event.target.value })}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Inicio"
          type="date"
          value={value.startDate}
          onChange={(event) => update({ startDate: event.target.value })}
        />
        <Field
          label="Fin (opcional)"
          type="date"
          value={value.endDate}
          onChange={(event) => update({ endDate: event.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Si cae en día inhábil"
          value={value.nonBusinessDayRule}
          onChange={(event) =>
            update({ nonBusinessDayRule: event.target.value as NonBusinessDayRule })
          }
        >
          <option value="PREVIOUS">Mover al día hábil anterior</option>
          <option value="NEXT">Mover al día hábil siguiente</option>
          <option value="NONE">No ajustar</option>
        </SelectField>
        <div className="flex items-end">
          <Checkbox
            label="Usar calendario de festivos"
            checked={value.useHolidays}
            onChange={(event) => update({ useHolidays: event.target.checked })}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
