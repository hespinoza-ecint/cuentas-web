import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { clearSession } from '../../lib/auth/session.ts'
import { logout } from '../auth/auth-api.ts'
import { useSessionUser } from '../auth/use-session.ts'

export function HomePage() {
  const user = useSessionUser()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    try {
      await logout()
    } catch {
      // Si el servidor ya no reconoce la sesión, basta con limpiar el estado local.
    }
    clearSession()
    void navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Hola, {user?.firstName}</h1>
        <p className="mt-1 text-sm text-slate-500">{user?.email}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            to="/estado"
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Estado del backend
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Fase 2 (autenticación) completada. En la Fase 3 se construye el layout principal y el
          dashboard.
        </p>
      </section>
    </main>
  )
}
