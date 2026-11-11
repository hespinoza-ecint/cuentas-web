# Fase 36 — Inicio reordenado (bloque D de la auditoría)

## 1. Objetivo

Aplicar el bloque D de la [auditoría UX/UI](auditoria-ux-ui.md): que el Inicio
responda, sin desplazar, las tres preguntas en su orden — cuánto tengo y si me
alcanza, qué tengo que pagar, cómo van mis tarjetas.

## 2. Qué cambia para el usuario

| # (auditoría) | Antes | Ahora |
|---|---|---|
| UX-7 | Dos tarjetas con cifra grande ("Efectivo disponible" y "Flujo mínimo proyectado") | Una sola: el disponible arriba y, debajo, el mínimo proyectado con su fecha y el margen sobre el colchón (o cuánto falta) |
| UX-3 | "Próximos pagos" era el 4.º bloque, con 6 pagos y sin forma de ver más | Es el 2.º bloque: los 4 más próximos por fecha, con "hoy / mañana / en N días", y un botón para ver todos |
| UX-15 | El recomendador ocupaba el 3.er lugar | Va al final (también está en el "＋") |
| UX-10 | Usuario nuevo: ocho tarjetas en $0.00 | Tres pasos: crear cuenta, registrar tarjetas, definir colchón |
| UX-17 | La gráfica quedaba 1.3 pantallas abajo | Sube (hay dos bloques menos encima) y el héroe enlaza a ella con "Ver flujo" |
| 2.2 | Tarjetas de crédito como cajas con borde dentro de la tarjeta | Lista con divisores, ordenada por fecha de pago; si hay pago pendiente dice "Paga $X antes del …" |
| A10 | La barra de utilización no exponía su valor | `role="meter"` con nombre y `aria-valuenow` |

Detalles:

- "Total en N cuentas" solo aparece si difiere del disponible (antes repetía la
  misma cifra).
- Con colchón en $0 ya no se muestra "Dentro del colchón": aparece el enlace
  "Define tu colchón".
- El subtítulo de pagos agrega cuánto vence en los próximos 7 días.
- En escritorio el héroe y los pagos comparten renglón.

Orden final: efectivo → pagos → tarjetas → gráfica → gasto del mes → ingresos →
recomendador.

## 3. Cambios

| Archivo | Cambio |
|---|---|
| `src/features/dashboard/DashboardPage.tsx` | Nuevo orden, héroe único, lista de pagos con vista previa, tarjetas sin cajas, primer uso (`FirstRunSteps`), `relativeDay` |
| `src/features/dashboard/dashboard.test.tsx` | Pruebas del primer uso, de la vista previa de pagos y del medidor |

Sin dependencias nuevas ni cambios de API: el margen sale de
`minimum.balance − minCashBuffer` y los días, de `daySpan` (ya existía en
`cashflow-chart-model.ts`).

## 4. Decisiones

- **Se muestran los 4 pagos más próximos, no "los de 7 días".** Filtrar por
  semana deja la tarjeta vacía justo cuando el siguiente pago está a 10 días; la
  cifra de 7 días va en el subtítulo y cada fila dice cuánto falta.
- **Los pagos y las tarjetas se ordenan en el cliente** por fecha: el orden de
  llegada de la API no está garantizado y la vista previa depende de él.
- **El saludo se queda.** Quitarlo es parte del bloque E (título en la cabecera)
  y hoy lo usan como señal de carga la mayoría de las pruebas y el E2E.
- **"Efectivo disponible" conserva su nombre.** La auditoría proponía
  "Disponible", pero la app también muestra crédito disponible y el nombre largo
  no se confunde.
- **Sin mini-gráfica en el héroe.** La auditoría la proponía; un enlace "Ver
  flujo" a la gráfica completa resuelve la navegación sin una segunda gráfica que
  mantener.
- **La gráfica no se compactó.** Sigue mostrando saldo inicial, mínimo y final;
  quitarle el mínimo (ahora también en el héroe) queda para cuando se rediseñe su
  cabecera.
- **El primer uso reemplaza todo el tablero** solo cuando no hay cuentas **ni**
  tarjetas; con cualquiera de las dos ya hay algo que resumir.

## 5. Pruebas

| Prueba | Qué cubre |
|---|---|
| "muestra efectivo, flujo mínimo, tarjetas…" | Fila de pago con "en 21 días"; "Paga … antes del …" en la tarjeta con pago pendiente; medidor con `aria-valuenow` |
| "sin cuentas ni tarjetas muestra por donde empezar…" | Primer uso en lugar del tablero en ceros |
| "muestra los primeros pagos por fecha y el resto al pedirlo" | Orden por fecha, vista previa de 4, "hoy", botón "Ver los 6 pagos" |

## 6. Verificación

| Comando | Resultado (10 nov 2026) |
|---|---|
| `npm.cmd run lint` | sin hallazgos |
| `npm.cmd run build` | correcto |
| `npm.cmd run test` | 38 archivos, 173 pruebas, todas pasan (en dos corridas: 35 archivos en la primera; los 3 que no arrancaron por "Failed to start threads worker" pasaron al repetirlos) |
| `npm.cmd run test:e2e` | 4 pruebas pasan en 6.5 min: credenciales inválidas, flujo completo, importar Excel (escritorio) y flujo móvil |

Validación en pantalla (API local contra `Cuentas_Test`, 375 × 812, tema claro),
con un usuario nuevo:

| Caso | Medido |
|---|---|
| Sin cuentas ni tarjetas | Se muestran los tres pasos, no el tablero |
| Con 1 cuenta y 1 tarjeta con saldo | Efectivo en y = 147, pagos en 355, tarjetas en 507: los tres sobre el pliegue (754). La gráfica empieza en 688 (antes 976) |
| Colchón en $0 | Aparece "Define tu colchón" en lugar del badge |
| Fila de pago | "Corte · 4 dic 2026 · en 24 días" completa; la descripción larga se recorta sola |
| "Ver flujo" | Lleva la gráfica a 80 px del borde superior (bajo la cabecera) |
| Ancho | Todas las tarjetas de 16 a 359 px. La primera versión dejaba las dos primeras 15 px más anchas: una rejilla sin `grid-cols-1` se estira con texto `truncate`; corregido en ambas rejillas |

No se vio en pantalla: el estado "por debajo del colchón", una tarjeta con pago
pendiente, más de 4 pagos (los tres los cubren las pruebas unitarias), el
escritorio ni el tema oscuro.
