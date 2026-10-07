# Fase 12 — Experiencia móvil y responsividad

## 1. Objetivo

Que la PWA se sienta cómoda en el teléfono: navegación con el pulgar, diálogos
que no se cortan cuando sale el teclado, campos sin zoom automático en iOS y
captura rápida de movimientos sin navegar a cada pantalla.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| Base táctil | Los campos usan 16 px en móvil (`text-base sm:text-sm`) para desactivar el zoom automático de iOS; los botones son más altos (hasta 40–44 px) y vuelven a la densidad de escritorio desde `sm` |
| Área segura | Utilidades `safe-t` / `safe-b` con `env(safe-area-inset-*)`: el header, la barra inferior y el pie de las hojas respetan el notch y la barra de gestos; `min-h-dvh` sustituye a `min-h-screen` |
| Diálogos | En móvil son hojas ancladas abajo (ancho completo, `max-h-[90dvh]`, scroll interno y pie fijo con los botones apilados a lo ancho); desde `sm` quedan centrados como antes. Se eliminaron los `max-h-[90vh]` duplicados en 8 diálogos |
| Navegación inferior | 5 pestañas: **Inicio · Compras · Tarjetas · Recomendador · Más**. "Más" abre una hoja con el resto de las secciones agrupadas (Dinero, Tarjetas, Planeación, Cuenta, Administración) y "Cerrar sesión"; el menú desplegable del header queda solo para escritorio |
| Acciones rápidas | Botón flotante "＋" (solo móvil): Gasto (formulario reutilizado), Compra con tarjeta y Confirmar ingreso (lista los próximos depósitos). Si faltan cuentas o tarjetas, ofrece crearlas |
| Listas | Filas en dos niveles (título y monto arriba; fecha, cuenta y acciones abajo) en Movimientos, Gastos, Compras, Pagos y Recurrentes |
| Filtros | En Movimientos, Gastos y Compras se pliegan tras "Filtros (n)" en móvil; desde `sm` siguen visibles |
| Gráfica de flujo | En pantallas angostas usa un `viewBox` menor (texto legible) y muestra solo las fechas de los extremos |
| Cabeceras | `PageHeader` apila las acciones a lo ancho en móvil |

## 3. Decisiones

- **Un solo punto de cambio para los diálogos**: la hoja inferior y el pie fijo
  viven en `components/ui/dialog.tsx`; los 24 diálogos existentes los heredan
  sin tocar cada formulario.
- **Pie fijo con `sticky`**: el pie se pega al fondo del scroll de la hoja, así
  el botón de guardar queda visible aunque el formulario sea largo.
- **El "＋" reutiliza los diálogos existentes** (`ExpenseFormDialog`,
  `PurchaseFormDialog`, `ConfirmIncomeDialog`): sin formularios duplicados y
  con las mismas validaciones e invalidaciones de caché.
- **"Ingreso" no inventa un registro nuevo**: en el modelo los ingresos se
  confirman desde una ocurrencia programada; la acción rápida lista las
  próximas y, si no hay, enlaza a Ingresos.
- **Sin dependencias nuevas**: todo con utilidades de Tailwind 4 (`@utility`)
  y CSS `env()`.

## 4. Archivos principales

| Archivo | Cambio |
|---|---|
| `src/index.css` | Utilidades `safe-t`/`safe-b` y `text-size-adjust` |
| `src/components/ui/dialog.tsx` | Hoja inferior en móvil + pie fijo apilado |
| `src/components/ui/button.tsx` | Alturas táctiles por breakpoint |
| `src/components/ui/page-header.tsx` | Acciones a lo ancho en móvil |
| `src/components/ui/filters-card.tsx` | Nuevo: filtros plegables con contador |
| `src/app/AppShell.tsx` | Pestañas, hoja "Más", áreas seguras |
| `src/app/nav.ts` | Pestañas fijas y grupos de la hoja "Más" |
| `src/app/QuickActions.tsx` | Nuevo: botón "＋" y sus hojas |
| `src/features/*/{Movements,Expenses,Purchases,CardPayments,Recurring}Page.tsx` | Filas en dos niveles y filtros plegables |
| `src/features/dashboard/CashflowChart.tsx` | Tamaño y fechas según el ancho |

## 5. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 25 archivos / 74 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # OK
npm.cmd run test:e2e    # 3 pruebas: 2 de escritorio + 1 móvil (Pixel 7)
```

La prueba móvil (`e2e/mobile.spec.ts`, proyecto `mobile`) recorre registro,
verificación, login, la hoja "Más", la creación de una cuenta, un gasto con el
botón "＋" y comprueba que **no hay scroll horizontal** ni botones fuera de la
pantalla. Las pruebas de navegación y acciones rápidas en Vitest viven en
`src/app/app-shell-mobile.test.tsx`.

## 6. Despliegue

Es un cambio solo de frontend:

```bash
docker compose build web && docker compose up -d web
```

En el teléfono, recarga con `Ctrl+F5` (o cierra y abre la PWA) para que entre
la nueva versión del service worker.
