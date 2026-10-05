import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingScreen } from '../../components/shared/LoadingScreen.tsx'
import { bootstrapSession } from '../../lib/auth/session.ts'
import { useSessionStatus } from './use-session.ts'

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
