import { setupServer } from 'msw/node'

/** Servidor MSW: cada prueba registra sus manejadores con `server.use(...)`. */
export const server = setupServer()
