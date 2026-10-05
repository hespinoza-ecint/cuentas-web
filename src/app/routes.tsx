import type { RouteObject } from 'react-router'
import { NotFoundPage } from '../components/shared/NotFoundPage.tsx'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.tsx'
import { LoginPage } from '../features/auth/LoginPage.tsx'
import { RegisterPage } from '../features/auth/RegisterPage.tsx'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.tsx'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.tsx'
import { RequireAuth, RedirectIfAuthenticated, SessionGate } from '../features/auth/AuthGuard.tsx'
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx'
import { HealthPage } from '../features/health/HealthPage.tsx'
import { ProfilePage } from '../features/profile/ProfilePage.tsx'
import { SessionsPage } from '../features/sessions/SessionsPage.tsx'
import { SettingsPage } from '../features/settings/SettingsPage.tsx'
import { AppShell } from './AppShell.tsx'

export const routes: RouteObject[] = [
  {
    element: <SessionGate />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/registro', element: <RegisterPage /> },
          { path: '/recuperar', element: <ForgotPasswordPage /> },
          { path: '/restablecer', element: <ResetPasswordPage /> },
        ],
      },
      { path: '/verificar-correo', element: <VerifyEmailPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/perfil', element: <ProfilePage /> },
              { path: '/configuracion', element: <SettingsPage /> },
              { path: '/sesiones', element: <SessionsPage /> },
              { path: '/estado', element: <HealthPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
