import { Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { SubmitButton as FormSubmitButton } from '../../components/ui/submit-button.tsx'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Marco de las pantallas de acceso: siempre oscuras, con la marca arriba. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-inverse p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-on-brand">
        <Wallet className="size-5" aria-hidden="true" />
      </span>
      <section className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-menu">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-secondary">{footer}</div>}
      </section>
    </main>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <FormSubmitButton pending={pending} size="lg" className="w-full" pendingLabel="Procesando…">
      {children}
    </FormSubmitButton>
  )
}
