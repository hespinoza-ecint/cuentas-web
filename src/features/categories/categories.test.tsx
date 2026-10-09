import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const systemCategory = {
  id: 'sys-1',
  userId: null,
  parentId: null,
  name: 'Alimentos',
  kind: 'EXPENSE',
  icon: null,
  isSystem: true,
}

const ownCategory = {
  id: 'cat-1',
  userId: 'user-1',
  parentId: null,
  name: 'Mascotas',
  kind: 'EXPENSE',
  icon: 'paw',
  isSystem: false,
}

describe('categorías propias', () => {
  it('separa las categorías propias de las del sistema', async () => {
    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([systemCategory, ownCategory])),
    )

    renderApp(['/categorias'])

    expect(await screen.findByText('Mascotas')).toBeInTheDocument()
    expect(screen.getByText(/Tus categorías \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Categorías del sistema \(1\)/)).toBeInTheDocument()
    expect(screen.getByText('Alimentos')).toBeInTheDocument()
  })

  it('crea una categoría propia', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([systemCategory])),
      http.post(`${API_BASE}/api/v1/categories`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { ...ownCategory, id: 'cat-new', name: 'Viajes' },
          { status: 201 },
        )
      }),
    )

    renderApp(['/categorias'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nueva categoría' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Viajes')
    await user.click(within(dialog).getByRole('button', { name: 'Crear categoría' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.name).toBe('Viajes')
    expect(created?.kind).toBe('EXPENSE')
    expect(created?.parentId).toBeUndefined()
  })

  it('elimina una categoría propia con confirmación', async () => {
    let getCalls = 0
    let deletedId: string | null = null

    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/categories`, () => {
        getCalls += 1
        return HttpResponse.json(getCalls === 1 ? [systemCategory, ownCategory] : [systemCategory])
      }),
      http.delete(`${API_BASE}/api/v1/categories/:id`, ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderApp(['/categorias'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Más acciones de Mascotas' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(deletedId).toBe('cat-1'))
    await waitFor(() => expect(screen.queryByText('Mascotas')).not.toBeInTheDocument())
  })
})
