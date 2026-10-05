import {
  Activity,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Hammer,
  History,
  LayoutDashboard,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tags,
  TrendingUp,
  User,
  UserCog,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/recomendador', label: 'Recomendador', icon: Sparkles },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/recurrentes', label: 'Recurrentes', icon: Repeat },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/pagos', label: 'Pagos', icon: Banknote },
  { to: '/recomendaciones', label: 'Historial', icon: History },
  { to: '/reglas', label: 'Reglas', icon: SlidersHorizontal },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
  { to: '/sesiones', label: 'Sesiones', icon: ShieldCheck },
  { to: '/cuenta', label: 'Cuenta y datos', icon: UserCog },
  { to: '/estado', label: 'Estado', icon: Activity },
  { to: '/admin/reglas', label: 'Reglas globales', icon: Wrench, adminOnly: true },
  { to: '/admin/mantenimiento', label: 'Mantenimiento', icon: Hammer, adminOnly: true },
]
