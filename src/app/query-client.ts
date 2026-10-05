import { QueryClient } from '@tanstack/react-query'

/**
 * Politica de datos del frontend:
 * - Los datos financieros se revalidan con frecuencia moderada.
 * - Sin reintentos agresivos: los errores de negocio (4xx) no se reintentan.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
