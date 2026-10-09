import { ChevronDown, LogOut, Menu, Monitor, Moon, Sun, Wallet, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Button } from '../components/ui/button.tsx'
import { Banner } from '../components/ui/banner.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { SectionTabs } from '../components/ui/section-tabs.tsx'
import { ThemeToggle } from '../components/ui/theme-toggle.tsx'
import { Toaster } from '../components/ui/toast.tsx'
import { useSessionUser } from '../features/auth/use-session.ts'
import { useLogout } from '../features/auth/use-logout.ts'
import { useOnlineStatus } from '../lib/online.ts'
import { useTheme, type ThemePreference } from '../lib/theme.ts'
import { cn } from '../lib/utils.ts'
import {
  MOBILE_MENU_GROUPS,
  MOBILE_TAB_PATHS,
  NAV_GROUPS,
  NAV_ITEMS,
  findModule,
  findNavItem,
  type NavItem,
} from './nav.ts'
import { QuickActions } from './QuickActions.tsx'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

/**
 * Layout de la aplicación autenticada.
 *
 * Móvil: barra inferior con Inicio · Movimientos · (＋) · Tarjetas · Más y
 * pestañas de sección dentro de cada módulo. Escritorio: barra lateral
 * agrupada por tema, mismos módulos.
 */
export function AppShell() {
  const user = useSessionUser()
  const { logout, pending } = useLogout()
  const theme = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const online = useOnlineStatus()

  const canSee = (adminOnly?: boolean) => !adminOnly || user?.role === 'ADMIN'

  const items = NAV_ITEMS.filter((item) => canSee(item.adminOnly))
  const tabs = MOBILE_TAB_PATHS.map(findNavItem)
  const module = findModule(location.pathname)
  const groups = MOBILE_MENU_GROUPS.map((group) => ({
    label: group.label,
    items: group.paths.map(findNavItem).filter((item) => canSee(item.adminOnly)),
  })).filter((group) => group.items.length > 0)

  const isPathActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  const moreActive = MOBILE_MENU_GROUPS.flatMap((group) => group.paths).some(isPathActive)

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="safe-t sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-on-brand">
              <Wallet className="size-4" aria-hidden="true" />
            </span>
            Cuentas
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            {/* El menú desplegable es de escritorio; en móvil está la hoja "Más". */}
            <div className="relative hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="max-w-28 truncate">{user?.firstName}</span>
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-menu"
                  >
                    <p className="truncate px-3 py-2 text-xs text-ink-muted">{user?.email}</p>
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-surface-subtle"
                      >
                        <item.icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </NavLink>
                    ))}
                    <div className="my-1 h-px bg-line" />
                    <button
                      type="button"
                      role="menuitem"
                      disabled={pending}
                      onClick={() => void logout()}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-60"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      {pending ? 'Cerrando…' : 'Cerrar sesión'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {!online && (
        <Banner icon={WifiOff} tone="warning">
          Sin conexión: ves los últimos datos guardados. Las operaciones se reactivan al
          reconectarte.
        </Banner>
      )}

      {user?.status === 'PENDING_DELETION' && (
        <Banner
          tone="danger"
          action={
            <Link to="/cuenta" className="font-medium underline">
              Gestionar
            </Link>
          }
        >
          Tu cuenta está en proceso de eliminación.
        </Banner>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav aria-label="Principal" className="space-y-5">
            <div className="space-y-1">
              {items
                .filter((item) => item.to === '/')
                .map((item) => (
                  <SidebarLink key={item.to} item={item} />
                ))}
            </div>
            {NAV_GROUPS.map((group) => {
              const groupItems = group.paths
                .map(findNavItem)
                .filter((item) => canSee(item.adminOnly))
              if (groupItems.length === 0) {
                return null
              }
              return (
                <div key={group.label}>
                  <p className="px-2.5 text-2xs font-semibold tracking-wider text-ink-muted uppercase">
                    {group.label}
                  </p>
                  <div className="mt-1 space-y-1">
                    {groupItems.map((item) => (
                      <SidebarLink key={item.to} item={item} />
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-28 md:pb-8">
          {module && (
            <SectionTabs
              label={`Secciones de ${module.label}`}
              tabs={module.paths.map((path) => {
                const item = findNavItem(path)
                return { to: item.to, label: item.label, end: item.end }
              })}
            />
          )}
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación inferior"
        className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5">
          <BottomTab item={tabs[0]} active={location.pathname === '/'} />
          <BottomTab item={tabs[1]} active={module?.id === 'movimientos'} />
          <div className="relative">
            <QuickActions />
          </div>
          <BottomTab item={tabs[2]} active={module?.id === 'tarjetas'} />
          <button
            type="button"
            aria-haspopup="dialog"
            aria-current={moreActive ? 'page' : undefined}
            onClick={() => setMoreOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-2xs font-medium"
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center justify-center rounded-full transition',
                moreActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-muted',
              )}
            >
              <Menu className="size-5" aria-hidden="true" />
            </span>
            <span className={moreActive ? 'text-brand-ink' : 'text-ink-muted'}>Más</span>
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogTitle>Más secciones</DialogTitle>
          <DialogDescription>Todas las secciones de tu cuenta.</DialogDescription>

          {groups.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="text-2xs font-semibold tracking-wider text-ink-muted uppercase">
                {group.label}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-secondary hover:bg-surface-subtle"
                  >
                    <item.icon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-5 border-t border-line pt-3">
            <p className="px-1 text-2xs font-semibold tracking-wider text-ink-muted uppercase">
              Tema
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1" role="group" aria-label="Tema">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={theme.preference === option.value}
                  onClick={() => theme.setPreference(option.value)}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition',
                    theme.preference === option.value
                      ? 'bg-brand-soft text-brand-ink'
                      : 'text-ink-secondary hover:bg-surface-subtle',
                  )}
                >
                  <option.icon className="size-3.5" aria-hidden="true" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-line pt-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void logout()}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {pending ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-brand-soft text-brand-ink'
            : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
        )
      }
    >
      <item.icon className="size-4" aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}

function BottomTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-current={active ? 'page' : undefined}
      className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-2xs font-medium"
    >
      <span
        className={cn(
          'flex h-7 w-12 items-center justify-center rounded-full transition',
          active ? 'bg-brand-soft text-brand-ink' : 'text-ink-muted',
        )}
      >
        <item.icon className="size-5" aria-hidden="true" />
      </span>
      <span className={active ? 'text-brand-ink' : 'text-ink-muted'}>{item.label}</span>
    </NavLink>
  )
}
