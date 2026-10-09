# Fase 21 — Gráfica de flujo interactiva (escalones, colchón y detalle por día)

Fecha: octubre 2026. Solo `cuentas-web` (no hay cambios de API). La
documentación de la decisión está en `docs/decision_logs/fase-21-grafica-de-flujo.md`.

## Qué cambió

La gráfica de "Flujo de efectivo proyectado" (`src/features/dashboard/`)
tenía cuatro problemas reales y poca lectura de los datos que la API ya
mandaba. Se reescribió:

| Antes | Ahora |
|---|---|
| Línea diagonal entre puntos: sugería cambios graduales | **Escalones**: el saldo se mantiene plano y salta el día del movimiento |
| La línea terminaba en el último movimiento, no en `to` | Cubre toda la ventana elegida (extremo en `to`) |
| Al cambiar fechas, la tarjeta se desmontaba (parpadeo) | `placeholderData: keepPreviousData`: se atenúa mientras llega la nueva |
| Círculos con `key` duplicada si un movimiento caía en `from` | Serie normalizada sin fechas repetidas |
| Tooltip por `<title>` (inútil en móvil y con teclado) | Panel de detalle que responde a toque, arrastre y teclado |

Además se usan datos que ya venían de la API y no se dibujaban: `minCashBuffer`
(línea de colchón), `finalBalance` (cierre de ventana), `inflows`/`outflows` y
los `events` de cada día.

## Cómo se ve

- **Cifras primero**: saldo inicial · mínimo proyectado (con fecha) · saldo
  final (con diferencia contra el inicio). Montos protagonistas, como el resto
  del sistema "estado de cuenta".
- **Atajos de ventana**: 30 días · 90 días · 6 meses · 1 año (desde hoy), más
  los campos `Desde`/`Hasta` de siempre.
- **Colchón**: línea punteada ámbar con etiqueta. Los tramos de la curva por
  debajo del colchón se pintan en rojo y la zona entre la curva y el colchón se
  rellena tenue ("qué tan hondo cae"). El borde no depende solo del color: hay
  leyenda.
- **Franja de flujo diario** bajo la curva: barras de ingresos (verde, hacia
  arriba) y gastos (rojo, hacia abajo) por día; en ventanas de más de 120 días
  se agrupan por mes.
- **Panel de detalle**: se abre en el día del mínimo proyectado y muestra
  fecha, saldo al cierre, entradas/salidas y los movimientos del día (hasta 4).
  Se mueve con toque, arrastre del puntero y flechas ← → (Home/End también);
  tocar cualquier día de la ventana funciona aunque no tenga movimientos (el
  saldo que arrastra el escalón se calcula al vuelo).
- **"Ver como tabla"**: la misma información en una tabla (dentro de
  `<details>`), para lectores de pantalla y para copiar/pegar.
- **Eje legible**: montos abreviados ("$9.8 mil", "$1.2 M"), marcas de fecha
  semanales o mensuales según la ventana, y marca de "Hoy".

## Decisiones de diseño destacadas

1. **El cero solo se incluye cuando importa.** Si el saldo vive "lejos" del
   cero (mínimo mayor que el rango de la ventana), el eje se ajusta a los
   valores para no aplanar la curva; si está cerca o hay negativos, el cero
   aparece y la zona de riesgo es visible.
2. **Tamaño real del texto.** La gráfica mide su contenedor con
   `ResizeObserver` y dibuja en esas unidades (antes se escalaba un viewBox de
   ancho fijo y el texto cambiaba de tamaño). En jsdom (pruebas) usa un ancho de
   respaldo.
3. **Sin dependencias nuevas**: SVG propio como hasta ahora.
4. **Animación discreta**: la curva se traza al aparecer (`pathLength` +
   `stroke-dashoffset`); `prefers-reduced-motion` la desactiva con la regla
   global de `index.css`.

## Accesibilidad

- El contenedor de la gráfica es enfocable (`role="group"` + etiqueta e
  instrucciones) y las flechas recorren los días con movimientos.
- Región `role="status"` oculta que resume el día seleccionado (saldo,
  entradas, salidas, movimientos).
- Equivalente en tabla para el contenido completo.
- Riesgo comunicado con color + etiqueta ("Colchón", tramos rojos + leyenda).

## Archivos

- `src/features/dashboard/cashflow-chart-model.ts` (nuevo): cálculos puros
  (serie en escalones, escala "bonita", marcas, franja, montos abreviados).
- `src/features/dashboard/cashflow-chart-model.test.ts` (nuevo): 24 pruebas.
- `src/features/dashboard/CashflowChart.tsx`: reescrita.
- `src/features/dashboard/CashflowDayDetail.tsx` (nuevo): panel del día.
- `src/features/dashboard/DashboardPage.tsx`: `keepPreviousData` y estado de
  datos atrasados.
- `src/index.css`: animación `.chart-draw`.
- `src/features/dashboard/dashboard.test.tsx`: casos del rango, teclado y
  atajos.

## Pruebas

- Modelo: `npx.cmd vitest run src/features/dashboard/cashflow-chart-model.test.ts`.
- Integración del dashboard: `npx.cmd vitest run src/features/dashboard`.
- Cierre de fase: `lint` + `build` + `test` (web, 121 pruebas) y `test:e2e`
  (Playwright: 3 flujos en verde).
- Revisión visual con la API real: modo claro y oscuro, ventanas de 30 y 90
  días, detalle por clic y por teclado, tabla expandida; en móvil el E2E ya
  verifica que no haya scroll horizontal.

## Sacrificios aceptados

- La franja de flujo se agrupa por mes en ventanas largas (no hay detalle
  diario de barras más allá de 120 días); el panel de detalle sí conserva los
  movimientos reales.
- La tabla incluye solo días con movimientos y los extremos de la ventana
  (no todos los días del calendario).
- El eje Y usa montos abreviados en la gráfica; los montos exactos viven en
  las cifras y en la tabla.
