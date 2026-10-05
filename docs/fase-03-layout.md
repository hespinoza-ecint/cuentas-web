# Fase 3 — Layout principal, componentes y dashboard

## 1. Objetivo

Convertir la app autenticada en una aplicación navegable: shell con menú,
página de inicio con datos reales (dashboard), perfil, configuración financiera
y sesiones activas, más los componentes compartidos que usarán los CRUDs.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `app/AppShell.tsx` | Layout autenticado: sidebar en escritorio, tab bar en móvil, header con menú de usuario (perfil, configuración, sesiones, estado y cerrar sesión) |
| `app/nav.ts` | Definición única de la navegación (íconos de lucide) |
| `components/ui/*` | Primitivos locales estilo shadcn: `Button` (variantes con cva), `Card`, `Badge`, `Skeleton`, `Dialog` (Radix), `ConfirmDialog`, `EmptyState`, `PageHeader` |
| `components/shared/*` | `MoneyDisplay` (con color por signo), `MoneyInput` (pesos ↔ centavos), `StatusBadge`, `ErrorState`, `SuccessAlert` |
| **Dashboard** (`/`) | Efectivo disponible, flujo mínimo de 60 días con alerta de colchón, última recomendación, tarjetas con utilización y pago pendiente, próximos ingresos y pagos (30 días), gasto del mes con comparación y top de categorías. Usa `GET /dashboard/summary` y `GET /cashflow/projection` |
| **Perfil** (`/perfil`) | Datos personales (actualiza la sesión en memoria) y cambio de contraseña |
| **Configuración** (`/configuracion`) | Zona horaria, calendario de festivos, colchón, utilización, factor de ingresos variables, gracia, límite de retroceso y horizonte de proyección |
| **Sesiones** (`/sesiones`) | Lista de dispositivos, revocar una sesión con confirmación y cerrar todas |
| Pruebas | 5 archivos nuevos (26 pruebas en total): dashboard, perfil, configuración, sesiones y `MoneyInput` |

## 3. Decisiones

- **shadcn/ui:** el CLI oficial no puede cargar el workspace en esta ruta de
  OneDrive (falla con “Could not load the workspace config”, incluso con la
  versión anterior que sugiere). Se mantiene una capa local equivalente en
  `components/ui` (mismas convenciones: cva + Tailwind + Radix) para que, si el
  CLI funciona en otro entorno, los componentes puedan generarse en las mismas
  carpetas sin reescribir la app.
- **Dashboard con dos consultas**: `dashboard/summary` (una sola llamada con
  agregaciones del servidor) y `cashflow/projection` (mínimo y alerta de
  colchón). React Query cachea y revalida.
- **Rutas nuevas tras `RequireAuth` + `AppShell`**: el 404 global y las rutas
  públicas no cambian; la página de salud queda como `/estado` dentro del menú.
- **`MoneyInput`** ajusta su texto durante el render (patrón de React para
  sincronizar con cambios externos, sin efectos); emite centavos y valida el
  formato con `parsePesosToCents`.
- **Tiempos de prueba**: el entorno (OneDrive + 10 archivos en paralelo) tarda
  en montar jsdom; se elevó `testTimeout` a 20 s y el timeout de las consultas
  async de Testing Library a 5 s. Las aserciones funcionales no cambiaron.
- **`react(set-state-in-effect)`** de oxlint: se eliminó el efecto de
  `MoneyInput` usando el ajuste en render.

## 4. Verificación

```powershell
npm.cmd run typecheck
npm.cmd run test     # 10 archivos / 26 pruebas
npm.cmd run lint
npm.cmd run build    # incluye PWA
```

Cobertura de las pruebas nuevas:

- **Dashboard:** montos formateados, flujo mínimo bajo el colchón, utilización,
  tarjetas, próximos movimientos, categorías y error con reintento.
- **Perfil:** actualización reflejada en la cabecera y cambio de contraseña.
- **Configuración:** montos en centavos, tasas en puntos base y validación de
  porcentajes.
- **Sesiones:** revocación con diálogo de confirmación y refresco del listado.
- **MoneyInput:** conversión a centavos y error de formato.

## 5. Notas

- La gráfica de flujo de efectivo, el historial de recomendaciones y las reglas
  propias/admin llegan en la Fase 5.
- La pantalla de cuenta (exportar, eliminar, cancelar eliminación) y el manejo
  de `PENDING_DELETION` también quedan para la Fase 5.
- El recomendador y los CRUDs financieros son la Fase 4; el menú no incluye
  enlaces a secciones aún no implementadas.
- El build avisa que el bundle supera 500 kB (597 kB, gzip 185 kB). La
  división por rutas (code splitting) queda para la Fase 6 de optimización.
