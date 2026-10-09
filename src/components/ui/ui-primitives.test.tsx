import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pencil, Trash2 } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu } from './action-menu.tsx'
import { FormDialog } from './form-dialog.tsx'
import { ListRow } from './list-row.tsx'
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
})

describe('ListRow', () => {
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
