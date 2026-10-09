export function LoadingScreen({ message = 'Cargando…' }: { message?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-inverse">
      <p className="animate-pulse text-sm text-on-inverse-muted">{message}</p>
    </main>
  )
}
