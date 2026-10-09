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
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/recurrentes', label: 'Recurrentes', icon: Repeat },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/pagos', label: 'Pagos', icon: Banknote },
  { to: '/recomendador', label: 'Recomendador', icon: Sparkles },
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

/**
 * Módulos con subsecciones: la barra inferior lleva a la raíz del módulo y
 * dentro se navega con pestañas (SectionTabs). El orden de las pestañas es el
 * de esta lista.
 */
export interface NavModule {
  id: 'movimientos' | 'tarjetas'
  /** Ruta de la raíz del módulo (también es la pestaña que se marca). */
  root: string
  label: string
  /** Rutas que pertenecen al módulo (incluye la raíz). */
  paths: string[]
}

export const MODULES: NavModule[] = [
  {
    id: 'movimientos',
    root: '/movimientos',
    label: 'Movimientos',
    paths: ['/movimientos', '/gastos', '/ingresos', '/recurrentes', '/cuentas'],
  },
  {
    id: 'tarjetas',
    root: '/tarjetas',
    label: 'Tarjetas',
    paths: ['/tarjetas', '/compras', '/pagos'],
  },
]

/** Módulo al que pertenece una ruta (las rutas de detalle cuentan como su módulo). */
export function findModule(pathname: string): NavModule | undefined {
  return MODULES.find((module) =>
    module.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
  )
}

/** Pestañas fijas de la barra inferior en móvil (entre ellas va el botón "+"). */
export const MOBILE_TAB_PATHS = ['/', '/movimientos', '/tarjetas'] as const

export interface NavGroup {
  label: string
  paths: string[]
}

/** Grupos del menú lateral (escritorio) y de la hoja "Más" (móvil). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dinero',
    paths: ['/movimientos', '/gastos', '/ingresos', '/recurrentes', '/cuentas'],
  },
  { label: 'Tarjetas', paths: ['/tarjetas', '/compras', '/pagos'] },
  { label: 'Planeación', paths: ['/recomendador', '/recomendaciones', '/reglas', '/categorias'] },
  { label: 'Tu cuenta', paths: ['/perfil', '/configuracion', '/sesiones', '/cuenta', '/estado'] },
  { label: 'Administración', paths: ['/admin/reglas', '/admin/mantenimiento'] },
]

/**
 * Secciones de la hoja "Más" (móvil): lo que no cabe en la barra inferior.
 * Dinero y Tarjetas se alcanzan por sus módulos, así que aquí solo viven
 * Planeación, cuenta y administración.
 */
export const MOBILE_MENU_GROUPS: NavGroup[] = NAV_GROUPS.filter(
  (group) => group.label !== 'Dinero' && group.label !== 'Tarjetas',
)

/** Ítem de navegación por ruta (falla al compilar si la ruta no existe). */
export function findNavItem(path: string): NavItem {
  const item = NAV_ITEMS.find((navItem) => navItem.to === path)
  if (!item) {
    throw new Error(`Ruta de navegación desconocida: ${path}`)
  }
  return item
}
