import { ChevronDown, LogOut, Menu, WifiOff, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Button } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { useSessionUser } from '../features/auth/use-session.ts'
import { useLogout } from '../features/auth/use-logout.ts'
import { useOnlineStatus } from '../lib/online.ts'
import { cn } from '../lib/utils.ts'
import { MOBILE_MENU_GROUPS, MOBILE_TAB_PATHS, NAV_ITEMS, findNavItem } from './nav.ts'
import { QuickActions } from './QuickActions.tsx'

/** Layout de la aplicación autenticada: sidebar, header y navegación móvil. */
export function AppShell() {
  const user = useSessionUser()
  const { logout, pending } = useLogout()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const online = useOnlineStatus()

  const canSee = (adminOnly?: boolean) => !adminOnly || user?.role === 'ADMIN'

  const items = NAV_ITEMS.filter((item) => canSee(item.adminOnly))
  const tabs = MOBILE_TAB_PATHS.map(findNavItem)
  const groups = MOBILE_MENU_GROUPS.map((group) => ({
    label: group.label,
    items: group.paths.map(findNavItem).filter((item) => canSee(item.adminOnly)),
  })).filter((group) => group.items.length > 0)
  const moreActive = groups.some((group) =>
    group.items.some((item) => item.to === location.pathname),
  )

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
    <div className="min-h-dvh bg-slate-100">
      <header className="safe-t sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <Wallet className="size-5" aria-hidden="true" />
            Cuentas
          </Link>

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
                  className="absolute right-0 z-50 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                >
                  <p className="truncate px-3 py-2 text-xs text-slate-500">{user?.email}</p>
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <item.icon className="size-4" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  ))}
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {pending ? 'Cerrando…' : 'Cerrar sesión'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {!online && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 border-b border-slate-300 bg-slate-200 px-4 py-2 text-center text-sm text-slate-700"
        >
          <WifiOff className="size-4" aria-hidden="true" />
          Sin conexión: se muestran los últimos datos guardados. Las operaciones se reactivan al
          reconectarte.
        </div>
      )}

      {user?.status === 'PENDING_DELETION' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          Tu cuenta está en proceso de eliminación.{' '}
          <Link to="/cuenta" className="font-medium underline">
            Gestionar
          </Link>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="space-y-1" aria-label="Principal">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900',
                  )
                }
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-28 md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación inferior"
        className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition',
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-500',
                    )}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className={isActive ? 'text-slate-900' : 'text-slate-500'}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium"
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center justify-center rounded-full transition',
                moreActive ? 'bg-slate-900 text-white' : 'text-slate-500',
              )}
            >
              <Menu className="size-5" aria-hidden="true" />
            </span>
            <span className={moreActive ? 'text-slate-900' : 'text-slate-500'}>Más</span>
          </button>
        </div>
      </nav>

      <QuickActions />

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogTitle>Más secciones</DialogTitle>
          <DialogDescription>Todas las secciones de tu cuenta.</DialogDescription>

          {groups.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {group.label}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <item.icon className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-5 border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {pending ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
