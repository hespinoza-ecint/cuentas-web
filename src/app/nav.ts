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

/** Pestañas fijas de la barra inferior en móvil (la quinta es "Más"). */
export const MOBILE_TAB_PATHS = ['/', '/compras', '/tarjetas', '/recomendador'] as const

export interface NavGroup {
  label: string
  paths: string[]
}

/** Secciones de la hoja "Más" (móvil), agrupadas por tema. */
export const MOBILE_MENU_GROUPS: NavGroup[] = [
  {
    label: 'Dinero',
    paths: ['/movimientos', '/cuentas', '/ingresos', '/gastos', '/recurrentes', '/categorias'],
  },
  { label: 'Tarjetas', paths: ['/pagos'] },
  { label: 'Planeación', paths: ['/recomendaciones', '/reglas'] },
  { label: 'Cuenta', paths: ['/perfil', '/configuracion', '/sesiones', '/cuenta', '/estado'] },
  { label: 'Administración', paths: ['/admin/reglas', '/admin/mantenimiento'] },
]

/** Ítem de navegación por ruta (falla al compilar si la ruta no existe). */
export function findNavItem(path: string): NavItem {
  const item = NAV_ITEMS.find((navItem) => navItem.to === path)
  if (!item) {
    throw new Error(`Ruta de navegación desconocida: ${path}`)
  }
  return item
}
