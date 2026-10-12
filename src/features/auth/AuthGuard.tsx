import { Suspense, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { LoadingScreen } from '../../components/shared/LoadingScreen.tsx'
import { purgeApiCache } from '../../lib/api-cache.ts'
import { bootstrapSession } from '../../lib/auth/session.ts'
import { useSessionStatus, useSessionUser } from './use-session.ts'

/** Intenta recuperar la sesión (cookie de refresh) antes de renderizar la app. */
export function SessionGate() {
  const status = useSessionStatus()

  useEffect(() => {
    void bootstrapSession()
  }, [])

  return (
    <>
      <SessionCacheGuard />
      {status === 'unknown' ? (
        <LoadingScreen message="Recuperando sesión…" />
      ) : (
        <Suspense fallback={<LoadingScreen message="Cargando…" />}>
          <Outlet />
        </Suspense>
      )}
    </>
  )
}

/**
 * Al terminar la sesión (cerrar sesión, expiración o eliminación de cuenta)
 * vacía la cache de datos y la del service worker: en un equipo compartido el
 * siguiente usuario no debe ver nada del anterior.
 */
export function SessionCacheGuard(): null {
  const queryClient = useQueryClient()
  const status = useSessionStatus()
  const previous = useRef(status)

  useEffect(() => {
    const was = previous.current
    previous.current = status
    if (status === 'anonymous' && was !== 'anonymous') {
      queryClient.clear()
      purgeApiCache()
    }
  }, [status, queryClient])

  return null
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
