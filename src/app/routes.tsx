import type { RouteObject } from 'react-router'
import { NotFoundPage } from '../components/shared/NotFoundPage.tsx'
import { RequireAdmin, RequireAuth, RedirectIfAuthenticated, SessionGate } from '../features/auth/AuthGuard.tsx'
import { AppShell } from './AppShell.tsx'
import {
  AccountPage,
  AdminRulesPage,
  AccountsPage,
  CardDetailPage,
  CardPaymentsPage,
  CardsPage,
  CategoriesPage,
  DashboardPage,
  ExpensesPage,
  ForgotPasswordPage,
  HealthPage,
  IncomePage,
  LoginPage,
  MaintenancePage,
  MovementsPage,
  ProfilePage,
  PurchasesPage,
  RecommendationHistoryPage,
  RecommendationRulesPage,
  RecomendadorPage,
  RecurringPage,
  RegisterPage,
  ResetPasswordPage,
  SessionsPage,
  SettingsPage,
  VerifyEmailPage,
} from './lazy-pages.ts'

// Las páginas se cargan por ruta (code splitting): el shell y las guardas van
// en el chunk principal; cada pantalla pesa solo cuando se visita.
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
              { path: '/recomendador', element: <RecomendadorPage /> },
              { path: '/recomendaciones', element: <RecommendationHistoryPage /> },
              { path: '/reglas', element: <RecommendationRulesPage /> },
              { path: '/cuentas', element: <AccountsPage /> },
              { path: '/movimientos', element: <MovementsPage /> },
              { path: '/gastos', element: <ExpensesPage /> },
              { path: '/recurrentes', element: <RecurringPage /> },
              { path: '/ingresos', element: <IncomePage /> },
              { path: '/compras', element: <PurchasesPage /> },
              { path: '/tarjetas', element: <CardsPage /> },
              { path: '/tarjetas/:id', element: <CardDetailPage /> },
              { path: '/pagos', element: <CardPaymentsPage /> },
              { path: '/categorias', element: <CategoriesPage /> },
              { path: '/perfil', element: <ProfilePage /> },
              { path: '/configuracion', element: <SettingsPage /> },
              { path: '/sesiones', element: <SessionsPage /> },
              { path: '/cuenta', element: <AccountPage /> },
              { path: '/estado', element: <HealthPage /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: '/admin/reglas', element: <AdminRulesPage /> },
                  { path: '/admin/mantenimiento', element: <MaintenancePage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
