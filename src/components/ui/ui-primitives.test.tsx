import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pencil, Trash2 } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Field } from '../shared/Field.tsx'
import { ActionMenu } from './action-menu.tsx'
import { FormDialog } from './form-dialog.tsx'
import { ListRow } from './list-row.tsx'
import { SectionTabs } from './section-tabs.tsx'
import { Toaster } from './toast.tsx'
import { dismissToast, toast } from '../../lib/toast.ts'

describe('ActionMenu', () => {
  it('abre el menú, ejecuta la acción y cierra con Escape', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <ActionMenu
        label="Más acciones de prueba"
        items={[{ label: 'Reiniciar', icon: Pencil, onSelect }]}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Más acciones de prueba' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.click(await screen.findByRole('menuitem', { name: 'Reiniciar' }))
    expect(onSelect).toHaveBeenCalledTimes(1)

    await user.click(trigger)
    expect(await screen.findByRole('menuitem', { name: 'Reiniciar' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('recorre las acciones con las flechas y Tab cierra el menú', async () => {
    const user = userEvent.setup()

    render(
      <ActionMenu
        label="Acciones de prueba"
        items={[
          { label: 'Uno', onSelect: vi.fn() },
          { label: 'Dos', onSelect: vi.fn() },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Acciones de prueba' }))
    const primero = await screen.findByRole('menuitem', { name: 'Uno' })
    expect(primero).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Dos' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(primero).toHaveFocus()

    await user.keyboard('{Tab}')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })
})

describe('ListRow', () => {
  it('sin onOpen la fila es informativa y no un botón deshabilitado', () => {
    render(
      <ul>
        <ListRow title="Solo lectura" subtitle="Sin acciones" trailing="$10.00" />
      </ul>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Solo lectura')).toBeInTheDocument()
  })

  it('tocar la fila abre el detalle; el menú "⋯" no dispara la fila', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const onDelete = vi.fn()

    render(
      <ul>
        <ListRow
          onOpen={onOpen}
          title="Supermercado"
          subtitle="4 oct 2026"
          trailing={<span>$150.00</span>}
          menu={[
            { label: 'Eliminar', icon: Trash2, tone: 'danger', onSelect: onDelete },
          ]}
          menuLabel="Más acciones de Supermercado"
        />
      </ul>,
    )

    const row = screen.getByText('Supermercado').closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /^Supermercado/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)

    await user.click(within(row).getByRole('button', { name: 'Más acciones de Supermercado' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    // El menú no debe abrir el detalle.
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})

describe('FormDialog', () => {
  it('con cambios sin guardar pide confirmación antes de cerrar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <FormDialog open dirty onOpenChange={onOpenChange}>
        <h2>Formulario</h2>
        <input aria-label="Campo" />
      </FormDialog>,
    )

    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('tiene un boton "Cerrar" y el foco inicial sigue en el primer campo', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <FormDialog open onOpenChange={onOpenChange}>
        <h2>Formulario</h2>
        <input aria-label="Campo" />
      </FormDialog>,
    )

    expect(await screen.findByLabelText('Campo')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('sin cambios cierra directo', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <FormDialog open onOpenChange={onOpenChange}>
        <h2>Formulario</h2>
      </FormDialog>,
    )

    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('Field', () => {
  it('asocia el texto de ayuda al campo', () => {
    render(<Field label="Meses" hint="Entre 2 y 48" />)

    expect(screen.getByLabelText('Meses')).toHaveAccessibleDescription('Entre 2 y 48')
  })
})

describe('SectionTabs', () => {
  it('centra la pestaña activa cuando queda fuera de pantalla', () => {
    // jsdom no calcula layout: se simulan las medidas de un telefono de 375px.
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(381)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80)
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(375)

    render(
      <MemoryRouter initialEntries={['/cuentas']}>
        <SectionTabs
          label="Secciones de Movimientos"
          tabs={[
            { to: '/movimientos', label: 'Movimientos' },
            { to: '/cuentas', label: 'Cuentas' },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Cuentas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation').scrollLeft).toBe(381 - (375 - 80) / 2)
    vi.restoreAllMocks()
  })
})

describe('Toaster', () => {
  it('muestra el aviso y lo retira con su botón de cerrar', async () => {
    const user = userEvent.setup()
    render(<Toaster />)

    const id = toast('Cuenta creada.')
    expect(await screen.findByText('Cuenta creada.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByText('Cuenta creada.')).not.toBeInTheDocument()
    dismissToast(id)
  })
})
