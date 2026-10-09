import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { Dialog, DialogContent } from './dialog.tsx'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Hay cambios sin guardar. Si el usuario intenta cerrar (velo, Escape o
   * gesto), primero se confirma que los quiere descartar.
   */
  dirty?: boolean
  /** Permite cerrar mientras guarda (para no duplicar el diálogo). */
  children: ReactNode
  className?: string
  'aria-describedby'?: string
}

/**
 * Envoltorio de diálogo para formularios: hoja inferior en móvil, guardia
 * contra pérdida accidental de datos y mismos gestos que Dialog.
 */
export function FormDialog({
  open,
  onOpenChange,
  dirty = false,
  children,
  className,
  ...props
}: FormDialogProps) {
  const [discardOpen, setDiscardOpen] = useState(false)

  function requestClose() {
    if (dirty) {
      setDiscardOpen(true)
    } else {
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            requestClose()
          }
        }}
      >
        <DialogContent className={className} {...props}>
          {children}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar cambios"
        description="Si sales ahora, lo que capturaste en este formulario se pierde."
        confirmLabel="Descartar"
        onConfirm={() => {
          setDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
