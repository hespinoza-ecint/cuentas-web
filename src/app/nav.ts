import {
  Activity,
  ArrowLeftRight,
  LayoutDashboard,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
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
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/recurrentes', label: 'Recurrentes', icon: Repeat },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
  { to: '/sesiones', label: 'Sesiones', icon: ShieldCheck },
  { to: '/estado', label: 'Estado', icon: Activity },
]
