import type { RouteObject } from 'react-router'
import { NotFoundPage } from '../components/shared/NotFoundPage.tsx'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.tsx'
import { LoginPage } from '../features/auth/LoginPage.tsx'
import { RegisterPage } from '../features/auth/RegisterPage.tsx'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.tsx'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.tsx'
import { RequireAuth, RedirectIfAuthenticated, SessionGate } from '../features/auth/AuthGuard.tsx'
import { HealthPage } from '../features/health/HealthPage.tsx'
import { HomePage } from '../features/home/HomePage.tsx'

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
          { path: '/', element: <HomePage /> },
          { path: '/estado', element: <HealthPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
