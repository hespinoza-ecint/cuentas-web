import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { clearSession } from '../../lib/auth/session.ts'
import { logout as logoutApi } from './auth-api.ts'

/** Cierra la sesión en el servidor (si se puede) y limpia el estado local. */
export function useLogout() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  const logout = useCallback(async () => {
    setPending(true)
    try {
      await logoutApi()
    } catch {
      // Si el servidor ya no reconoce la sesión, basta con limpiar el estado local.
    }
    clearSession()
    void navigate('/login', { replace: true })
  }, [navigate])

  return { logout, pending }
}
