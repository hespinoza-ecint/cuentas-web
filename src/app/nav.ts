import {
  Activity,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/recurrentes', label: 'Recurrentes', icon: Repeat },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/pagos', label: 'Pagos', icon: Banknote },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
  { to: '/sesiones', label: 'Sesiones', icon: ShieldCheck },
  { to: '/estado', label: 'Estado', icon: Activity },
]
