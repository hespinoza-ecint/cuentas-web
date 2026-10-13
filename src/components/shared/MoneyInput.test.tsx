import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MoneyInput } from './MoneyInput.tsx'

describe('MoneyInput', () => {
  it('emite centavos al capturar pesos', async () => {
    const onCentsChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MoneyInput label="Monto" valueCents={undefined} onCentsChange={onCentsChange} />,
    )

    await user.type(screen.getByLabelText('Monto'), '1,234.50')

    expect(onCentsChange).toHaveBeenLastCalledWith(123450)
  })

  it('muestra el valor en pesos y avisa si el texto es inválido', async () => {
    const onCentsChange = vi.fn()
    const user = userEvent.setup()

    render(<MoneyInput label="Monto" valueCents={500} onCentsChange={onCentsChange} />)
    const input = screen.getByLabelText('Monto')
    expect(input).toHaveValue('5.00')

    await user.clear(input)
    await user.type(input, 'abc')

    expect(await screen.findByRole('alert')).toHaveTextContent('monto válido')
  })

  it('limpia el monto del formulario cuando el texto deja de ser válido', async () => {
    const onCentsChange = vi.fn()
    const user = userEvent.setup()

    render(<MoneyInput label="Monto" valueCents={undefined} onCentsChange={onCentsChange} />)
    const input = screen.getByLabelText('Monto')

    await user.type(input, '99')
    expect(onCentsChange).toHaveBeenLastCalledWith(9900)

    await user.type(input, 'x')

    expect(await screen.findByRole('alert')).toHaveTextContent('monto válido')
    expect(onCentsChange).toHaveBeenLastCalledWith(undefined)
  })
})
