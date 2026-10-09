import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay/60" />
      <DialogPrimitive.Content
        className={cn(
          // Móvil: hoja anclada abajo, ancho completo, con scroll interno y
          // agarradera visual para indicar que se puede arrastrar/cerrar.
          'fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-surface px-5 pt-3 pb-5 shadow-sheet focus:outline-none',
          // Escritorio: diálogo centrado como siempre.
          'sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-[calc(100vw-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pt-5 sm:shadow-menu',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-surface-strong sm:hidden"
        />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold text-ink', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('mt-1 text-sm text-ink-muted', className)}
      {...props}
    />
  )
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        // Móvil: pie fijo dentro de la hoja; botones apilados y a lo ancho
        // (el principal queda arriba, al alcance del pulgar).
        'sticky bottom-0 z-10 mt-5 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 pt-3',
        '[padding-bottom:calc(0.75rem+env(safe-area-inset-bottom,0px))]',
        // Escritorio: fila alineada a la derecha, como antes.
        'sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0',
      )}
    >
      {children}
    </div>
  )
}
