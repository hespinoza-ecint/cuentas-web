export function LoadingScreen({ message = 'Cargando…' }: { message?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950">
      <p className="animate-pulse text-sm text-slate-300">{message}</p>
    </main>
  )
}
