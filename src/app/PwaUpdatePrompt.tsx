import { Download } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Banner } from '../components/ui/banner.tsx'
import { Button } from '../components/ui/button.tsx'

/**
 * Aviso "versión nueva": con registerType 'prompt' el service worker nuevo
 * espera a que la persona decida actualizar (antes era silencioso y hacía
 * falta Ctrl+F5).
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) {
    return null
  }

  return (
    <Banner
      tone="info"
      icon={Download}
      action={
        <Button size="sm" variant="secondary" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </Button>
      }
    >
      Hay una versión nueva de Cuentas.
    </Banner>
  )
}
