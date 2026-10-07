import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { Providers } from './app/providers.tsx'
import { router } from './app/router.tsx'
import { initTheme } from './lib/theme.ts'
import './index.css'

// Aplica el tema guardado (claro/oscuro/sistema) antes de montar la app.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
