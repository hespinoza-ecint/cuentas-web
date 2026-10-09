import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Banner } from '../components/ui/banner.tsx'
import { Button } from '../components/ui/button.tsx'

/*
 * Aviso "versión nueva" de la PWA.
 *
 * Se registra el service worker a mano (en producción) en lugar de usar
 * `virtual:pwa-register/react`: ese módulo virtual rompe las pruebas de
 * Vitest, y así el registro es explícito y fácil de seguir. El service
 * worker generado por vite-plugin-pwa (registerType 'prompt') entiende el
 * mensaje SKIP_WAITING y toma el control de inmediato.
 */
const SW_MESSAGE_SKIP_WAITING = { type: 'SKIP_WAITING' }

export function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return
    }

    let disposed = false
    let registration: ServiceWorkerRegistration | null = null

    const track = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaiting(reg.waiting)
        setNeedRefresh(true)
      }
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) {
          return
        }
        installing.addEventListener('statechange', () => {
          // 'installed' + un controlador activo = hay versión nueva esperando.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(installing)
            setNeedRefresh(true)
          }
        })
      })
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (disposed) {
          return
        }
        registration = reg
        track(reg)
      })
      .catch(() => {
        // Sin service worker (por ejemplo, navegador privado): la app funciona igual.
      })

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void registration?.update()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onControllerChange = () => {
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!needRefresh) {
    return null
  }

  return (
    <div className="safe-t fixed inset-x-0 top-0 z-[80]">
      <Banner
        tone="info"
        icon={Download}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (waiting) {
                waiting.postMessage(SW_MESSAGE_SKIP_WAITING)
              } else {
                window.location.reload()
              }
            }}
          >
            Actualizar
          </Button>
        }
      >
        Hay una versión nueva de Cuentas.
      </Banner>
    </div>
  )
}
