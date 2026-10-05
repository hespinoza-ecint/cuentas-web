import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { LoadingScreen } from '../../components/shared/LoadingScreen.tsx'
import { bootstrapSession } from '../../lib/auth/session.ts'
import { useSessionStatus, useSessionUser } from './use-session.ts'

/** Intenta recuperar la sesión (cookie de refresh) antes de renderizar la app. */
export function SessionGate() {
  const status = useSessionStatus()

  useEffect(() => {
    void bootstrapSession()
  }, [])

  if (status === 'unknown') {
    return <LoadingScreen message="Recuperando sesión…" />
  }

  return <Outlet />
}

export function RequireAuth() {
  const status = useSessionStatus()
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const status = useSessionStatus()

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

/** Rutas exclusivas del rol ADMIN (la API también las protege). */
export function RequireAdmin() {
  const user = useSessionUser()

  if (user?.role !== 'ADMIN') {
    return (
      <Card>
        <CardTitle>Solo administradores</CardTitle>
        <CardDescription>
          Esta sección requiere el rol ADMIN. Pide a quien administra la plataforma que lo asigne.
        </CardDescription>
      </Card>
    )
  }

  return <Outlet />
}
