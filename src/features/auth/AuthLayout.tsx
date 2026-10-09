import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-inverse p-6">
      <section className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-secondary">{footer}</div>}
      </section>
    </main>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-medium text-on-brand transition hover:bg-brand-hover disabled:opacity-60 sm:py-2"
    >
      {pending ? 'Procesando…' : children}
    </button>
  )
}
