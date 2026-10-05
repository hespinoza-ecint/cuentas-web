import { lazy } from 'react'

/**
 * Páginas cargadas por ruta (code splitting). Viven en su propio módulo para
 * que `routes.tsx` solo contenga la configuración de rutas.
 */
export const AccountPage = lazy(() =>
  import('../features/account/AccountPage.tsx').then((m) => ({ default: m.AccountPage })),
)
export const AdminRulesPage = lazy(() =>
  import('../features/admin/AdminRulesPage.tsx').then((m) => ({ default: m.AdminRulesPage })),
)
export const MaintenancePage = lazy(() =>
  import('../features/admin/MaintenancePage.tsx').then((m) => ({ default: m.MaintenancePage })),
)
export const AccountsPage = lazy(() =>
  import('../features/accounts/AccountsPage.tsx').then((m) => ({ default: m.AccountsPage })),
)
export const CardDetailPage = lazy(() =>
  import('../features/cards/CardDetailPage.tsx').then((m) => ({ default: m.CardDetailPage })),
)
export const CardsPage = lazy(() =>
  import('../features/cards/CardsPage.tsx').then((m) => ({ default: m.CardsPage })),
)
export const CategoriesPage = lazy(() =>
  import('../features/categories/CategoriesPage.tsx').then((m) => ({ default: m.CategoriesPage })),
)
export const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage.tsx').then((m) => ({ default: m.DashboardPage })),
)
export const ExpensesPage = lazy(() =>
  import('../features/expenses/ExpensesPage.tsx').then((m) => ({ default: m.ExpensesPage })),
)
export const RecurringPage = lazy(() =>
  import('../features/expenses/RecurringPage.tsx').then((m) => ({ default: m.RecurringPage })),
)
export const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage.tsx').then((m) => ({ default: m.ForgotPasswordPage })),
)
export const HealthPage = lazy(() =>
  import('../features/health/HealthPage.tsx').then((m) => ({ default: m.HealthPage })),
)
export const IncomePage = lazy(() =>
  import('../features/income/IncomePage.tsx').then((m) => ({ default: m.IncomePage })),
)
export const LoginPage = lazy(() =>
  import('../features/auth/LoginPage.tsx').then((m) => ({ default: m.LoginPage })),
)
export const MovementsPage = lazy(() =>
  import('../features/movements/MovementsPage.tsx').then((m) => ({ default: m.MovementsPage })),
)
export const CardPaymentsPage = lazy(() =>
  import('../features/payments/CardPaymentsPage.tsx').then((m) => ({ default: m.CardPaymentsPage })),
)
export const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage })),
)
export const PurchasesPage = lazy(() =>
  import('../features/purchases/PurchasesPage.tsx').then((m) => ({ default: m.PurchasesPage })),
)
export const RecommendationHistoryPage = lazy(() =>
  import('../features/recommendations/RecommendationHistoryPage.tsx').then((m) => ({
    default: m.RecommendationHistoryPage,
  })),
)
export const RecommendationRulesPage = lazy(() =>
  import('../features/recommendations/RecommendationRulesPage.tsx').then((m) => ({
    default: m.RecommendationRulesPage,
  })),
)
export const RecomendadorPage = lazy(() =>
  import('../features/recommendations/RecomendadorPage.tsx').then((m) => ({
    default: m.RecomendadorPage,
  })),
)
export const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage.tsx').then((m) => ({ default: m.RegisterPage })),
)
export const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage.tsx').then((m) => ({ default: m.ResetPasswordPage })),
)
export const SessionsPage = lazy(() =>
  import('../features/sessions/SessionsPage.tsx').then((m) => ({ default: m.SessionsPage })),
)
export const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })),
)
export const VerifyEmailPage = lazy(() =>
  import('../features/auth/VerifyEmailPage.tsx').then((m) => ({ default: m.VerifyEmailPage })),
)
