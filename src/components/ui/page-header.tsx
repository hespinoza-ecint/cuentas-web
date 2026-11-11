import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/utils.ts'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Enlace "volver" para pantallas de detalle (por ejemplo, tarjeta). */
  back?: { to: string; label: string }
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-5">
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-flex h-8 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          {/*
           * Movil: la cabecera de la app ya nombra la pantalla (ver AppShell), asi
           * que el titulo queda solo para lectores de pantalla. Las pantallas de
           * detalle (con "volver") lo conservan: su titulo no esta en la cabecera.
           */}
          <h1
            className={cn(
              'text-xl font-semibold tracking-tight text-ink sm:text-2xl',
              !back && 'max-md:sr-only',
            )}
          >
            {title}
          </h1>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
