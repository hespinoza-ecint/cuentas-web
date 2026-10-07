import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-medium text-slate-500">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Página no encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}
