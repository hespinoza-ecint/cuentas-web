import { lazy } from 'react'
import type { RouteObject } from 'react-router'
import { NotFoundPage } from '../components/shared/NotFoundPage.tsx'
import { RequireAdmin, RequireAuth, RedirectIfAuthenticated, SessionGate } from '../features/auth/AuthGuard.tsx'
import { AppShell } from './AppShell.tsx'

// Las páginas se cargan por ruta (code splitting): el shell y las guardas van
// en el chunk principal; cada pantalla pesa solo cuando se visita.
const AccountPage = lazy(() =>
  import('../features/account/AccountPage.tsx').then((m) => ({ default: m.AccountPage })),
)
const AdminRulesPage = lazy(() =>
  import('../features/admin/AdminRulesPage.tsx').then((m) => ({ default: m.AdminRulesPage })),
)
const MaintenancePage = lazy(() =>
  import('../features/admin/MaintenancePage.tsx').then((m) => ({ default: m.MaintenancePage })),
)
const AccountsPage = lazy(() =>
  import('../features/accounts/AccountsPage.tsx').then((m) => ({ default: m.AccountsPage })),
)
const CardDetailPage = lazy(() =>
  import('../features/cards/CardDetailPage.tsx').then((m) => ({ default: m.CardDetailPage })),
)
const CardsPage = lazy(() =>
  import('../features/cards/CardsPage.tsx').then((m) => ({ default: m.CardsPage })),
)
const CategoriesPage = lazy(() =>
  import('../features/categories/CategoriesPage.tsx').then((m) => ({ default: m.CategoriesPage })),
)
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage.tsx').then((m) => ({ default: m.DashboardPage })),
)
const ExpensesPage = lazy(() =>
  import('../features/expenses/ExpensesPage.tsx').then((m) => ({ default: m.ExpensesPage })),
)
const RecurringPage = lazy(() =>
  import('../features/expenses/RecurringPage.tsx').then((m) => ({ default: m.RecurringPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage.tsx').then((m) => ({ default: m.ForgotPasswordPage })),
)
const HealthPage = lazy(() =>
  import('../features/health/HealthPage.tsx').then((m) => ({ default: m.HealthPage })),
)
const IncomePage = lazy(() =>
  import('../features/income/IncomePage.tsx').then((m) => ({ default: m.IncomePage })),
)
const LoginPage = lazy(() =>
  import('../features/auth/LoginPage.tsx').then((m) => ({ default: m.LoginPage })),
)
const MovementsPage = lazy(() =>
  import('../features/movements/MovementsPage.tsx').then((m) => ({ default: m.MovementsPage })),
)
const CardPaymentsPage = lazy(() =>
  import('../features/payments/CardPaymentsPage.tsx').then((m) => ({ default: m.CardPaymentsPage })),
)
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage })),
)
const PurchasesPage = lazy(() =>
  import('../features/purchases/PurchasesPage.tsx').then((m) => ({ default: m.PurchasesPage })),
)
const RecommendationHistoryPage = lazy(() =>
  import('../features/recommendations/RecommendationHistoryPage.tsx').then((m) => ({
    default: m.RecommendationHistoryPage,
  })),
)
const RecommendationRulesPage = lazy(() =>
  import('../features/recommendations/RecommendationRulesPage.tsx').then((m) => ({
    default: m.RecommendationRulesPage,
  })),
)
const RecomendadorPage = lazy(() =>
  import('../features/recommendations/RecomendadorPage.tsx').then((m) => ({
    default: m.RecomendadorPage,
  })),
)
const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage.tsx').then((m) => ({ default: m.RegisterPage })),
)
const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage.tsx').then((m) => ({ default: m.ResetPasswordPage })),
)
const SessionsPage = lazy(() =>
  import('../features/sessions/SessionsPage.tsx').then((m) => ({ default: m.SessionsPage })),
)
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })),
)
const VerifyEmailPage = lazy(() =>
  import('../features/auth/VerifyEmailPage.tsx').then((m) => ({ default: m.VerifyEmailPage })),
)

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
