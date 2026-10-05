import {
  Activity,
  ArrowLeftRight,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Tags,
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
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
  { to: '/sesiones', label: 'Sesiones', icon: ShieldCheck },
  { to: '/estado', label: 'Estado', icon: Activity },
]
