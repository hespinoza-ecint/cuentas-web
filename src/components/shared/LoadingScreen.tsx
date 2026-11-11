import { Wallet } from 'lucide-react'

/**
 * Pantalla de carga a pantalla completa (arranque y recuperar sesión).
 * Usa el fondo del tema activo, no `inverse`: lleva a la app, y en tema claro
 * un fondo oscuro parpadeaba entre dos pantallas claras.
 */
export function LoadingScreen({ message = 'Cargando.' }: { message?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-on-brand">
        <Wallet className="size-6" aria-hidden="true" />
      </span>
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        {message}
      </p>
    </main>
  )
}
