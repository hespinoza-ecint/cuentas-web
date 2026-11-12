# Fase 39 — Pulido móvil

## 1. Objetivo

Segunda pasada de UX/UI, solo móvil, sobre lo que quedó sin pulir tras las fases
33–38 de la [auditoría](auditoria-ux-ui.md). No es un rediseño: casi todo son
clases en componentes compartidos. El backend no cambia.

## 2. Revisión

Se revisaron el shell, todos los componentes de `ui/` y `shared/`, Inicio, la
gráfica de flujo, Tarjetas (lista, detalle, corte), Compras (lista, formulario,
detalle MSI), Ingresos, la captura rápida y los avisos. Acceso, Configuración,
Perfil y Admin solo se revisaron por patrones.

**Método y límites:** revisión de código, sin medición en pantalla al escribir
esto; los tamaños se deducen de las clases. Los riesgos que dependen del
dispositivo están en la sección 6.

**Lo que ya estaba bien y no se tocó:** campos a 16 px (sin zoom en iOS),
safe-area, contraste AA de los tokens, `:focus-visible` global, regla de
movimiento reducido, skeleton + reintento en cada consulta, aviso sin conexión,
barra inferior de 56 px, `inputMode` en campos numéricos y el monto primero en
la captura.

## 3. Qué cambia para el usuario

| ID | Severidad | Pantalla | Antes | Ahora |
|---|---|---|---|---|
| N1 | Alta | Toda la app | `refetchOnWindowFocus: false` y sin recarga: al volver a la PWA instalada los saldos podían tener horas | Las consultas se refrescan al volver a la app (`staleTime` de 30 s evita ráfagas) |
| F1 | Alta | Formularios | El campo de monto no admitía `ref`: al fallar la validación el formulario no podía enfocarlo y el aviso quedaba fuera de pantalla | `MoneyInput` expone `ref`; los 21 formularios la pasan (`ref={field.ref}`) |
| C1 | Alta | Detalle de tarjeta | Lo que hay que pagar y cuándo vivía en una línea de 12 px en gris; el número grande era el saldo del corte | "Paga $X antes del D · en N días" con "Registrar pago"; cada corte encabeza "Vence D" con el monto sin intereses |
| T1 | Alta | Toda la app | Botones de 36–40 px (pies de hoja y CTA de página) | 44 px en móvil (`sm`/`md`), 48 px (`lg`), iconos de 44/40 px; escritorio igual |
| T2 | Alta | Formularios | Campos de 42 px, fechas que se encogen en iOS, sombra de tarjeta | `min-h-11`, `min-w-0`, sin sombra: el campo se lee como hueco |
| L1 | Alta | Listas | Una descripción sin espacios (importada del banco) se metía bajo el monto | `[overflow-wrap:anywhere]` en título y subtítulo |
| T3 | Alta | Ingresos | Editar y eliminar calendario eran dos iconos de 36 px separados por 2 px | Van al "⋯" de la fila, como en el resto |
| N2 | Media | Inicio | Las filas de tarjeta no se abrían: llegar al detalle costaba 3 toques | La fila entera abre la tarjeta, con chevron |
| C5 | Media | Inicio | El nombre del ingreso se comía la fecha (`truncate`) | Dos líneas, igual que en "Próximos pagos" |
| C3 | Media | Inicio, Tarjetas, detalle | Umbrales fijos de 30 %/50 % en Tarjetas y en el detalle; Inicio usaba el del usuario. Una tarjeta podía ser "Uso medio" en una pantalla y "Uso bajo" en otra | Un solo `UtilizationBar` con el umbral del usuario y `role="meter"` en las tres |
| C4 | Media | Detalle de tarjeta | Cuatro cifras y un badge en una sola frase de 12 px | `dl` de dos columnas (Disponible / Límite), nivel junto a la barra, badge solo si la tarjeta no está activa |
| C2 | Media | Detalle de compra | Para saber cuántas mensualidades faltaban había que contar badges | "Pagadas 3 de 12" con barra de progreso; el badge de la lista dice "MSI 3/12" |
| Y4 | Media | Compras | "próxima #4 por 1234.50": sin `$` ni separador de miles | `formatCents` (`$1,234.50`) |
| A1 | Media | Listas | Las filas informativas eran un `<button disabled>`: el lector anunciaba "no disponible" | Un `div` cuando la fila no se abre |
| A2 | Media | Menú "⋯" | `role="menu"` sin flechas; Tab salía al contenido tapado por el velo | Flechas, Home y End; Tab cierra el menú |
| T4 | Media | Pestañas de módulo | 40 px | 44 px |
| T5 | Media | Cabecera y detalle | "Volver" de 32 px, logo de 28 px, tema de 32×36 px | 44 px de área tocable |
| T6 | Media | Inicio y gráfica | "Ver flujo", "Define tu colchón", "Ver como tabla" y "Agregar comisión" eran texto de 16–36 px | 44 px de alto |
| T7 | Media | Formularios | Segmentos de 36 px | 44 px |
| Y1 | Media | Tarjetas y hojas | `CardTitle` de 14 px competía con el cuerpo, con el `h1` oculto en móvil | 16 px |
| Y2 | Media | Inicio | Totales de pagos y de deuda en 12 px gris | 14 px en tinta secundaria |
| Y3 | Media | Gráfica | Ejes de 10 px, leyenda y KPI de 11 px | Ejes de 11 px, el resto 12 px |
| L2 | Media | Tarjeta y compras | Con `flex-wrap` y sin `min-w-0`, una descripción larga tiraba el monto a un renglón aparte | Texto con `min-w-0 flex-1`, monto `shrink-0`, sin salto |
| L3 | Media | Cabecera de detalle y Compras | El "⋯" heredaba `flex-1` y ocupaba media fila; el CTA de Compras no era de ancho completo | "⋯" con `flex-none`, acciones sin `div` envolvente |
| L4 | Media | Gráfica | Dos campos de fecha siempre visibles arriba de la gráfica | Botón "Fechas" en móvil; escritorio sin cambio |
| M1 | Media | Hojas y menús | Aparecían de golpe | Entrada de 200 ms (hoja) y 150 ms (velo), solo transform/opacity |
| M2 | Media | Avisos | Los de éxito se iban a los 3.5 s | 5 s |
| F2 | Media | Hojas | Fecha y selector comparten 160 px a 375 px; en iOS las fechas pueden desbordar | Guarda `min-w-0`; falta verlo en un iPhone real |
| F5 | Baja | Compras | Sin tarjetas, "Registrar compra" estaba deshabilitado sin explicación | Estado vacío "Primero registra una tarjeta" con enlace a Tarjetas |
| T8 | Baja | Avisos | Cerrar de 24 px | 44 px |
| T9 | Baja | Filas y menús | Solo `hover:`, que en pantalla táctil no existe | `active:bg-surface-subtle` |
| Y5 | Baja | Formularios | Errores de campo en 12 px | 14 px |
| A3 | Baja | Avisos | El contenedor tenía `aria-live` y cada aviso su `role`: podía anunciarse dos veces | Solo el `role` de cada aviso |

## 4. Top 25 por impacto

1. N1 saldos viejos · 2. F1 error del monto invisible · 3. C1 qué pagar y cuándo ·
4. T1 botones < 44 px · 5. T2 campos < 44 px · 6. L1 texto bajo el monto ·
7. T3 borrar junto a editar · 8. N2 3 toques a la tarjeta · 9. C5 fecha del
ingreso cortada · 10. C3 nivel de uso contradictorio · 11. C2 progreso del plan ·
12. A1 filas "no disponible" · 13. A2 teclado y foco del menú · 14. T6 enlaces de
texto · 15. T4 pestañas · 16. T5 volver/logo/tema · 17. L2 monto en otro renglón ·
18. M2 duración del aviso · 19. F5 botón muerto · 20. T7 segmentos · 21. L4 fechas
de la gráfica · 22. F2 ancho de fechas en iOS · 23. Y4 monto sin formato ·
24. T8 cerrar aviso · 25. asa de la hoja sin gesto (no incluido).

## 5. Top mejoras visuales

1. C1 jerarquía del corte · 2. C4 tarjeta de saldo como `dl` · 3. Y1 títulos a
16 px · 4. M1 transiciones de hoja · 5. C2 barra del plan · 6. Y2 totales a 14 px ·
7. T1 CTA de altura completa · 8. T2 campos sin sombra · 9. Y3 texto de la
gráfica · 10. L3 fila de acciones · 11. L2 montos alineados · 12. C3 una sola
barra de uso · 13. Y4 monto con formato · 14. L4 cabecera de la gráfica más
ligera · 15. C5 ingresos en dos líneas · 16. T9 feedback al tocar · 17. Y5 tamaño
del error · 18. T7 segmentos · 19. degradado izquierdo de pestañas (no incluido).

## 6. Cambios por archivo

| Archivo | Cambio |
|---|---|
| `src/app/query-client.ts` | `refetchOnWindowFocus: true` |
| `src/components/shared/MoneyInput.tsx` | Prop `ref`; error a `text-sm` |
| `src/features/**/*Dialog.tsx` (21 usos) | `ref={field.ref}` en cada `MoneyInput` |
| `src/components/ui/button-variants.ts` | Alturas móviles 44/44/48 y `size-11`/`size-10` |
| `src/components/ui/control.ts` | `min-h-11 min-w-0`, sin `shadow-card` |
| `src/components/ui/list-row.tsx` | `div` sin `onOpen`; `overflow-wrap:anywhere` |
| `src/components/ui/action-menu.tsx` | Flechas/Home/End, Tab cierra, `active:` |
| `src/components/ui/dialog.tsx` + `src/index.css` | Keyframes `sheet-in` y `fade-in` |
| `src/components/ui/toast.tsx`, `src/lib/toast.ts` | Cerrar de 44 px, sin `aria-live` doble, 5 s |
| `src/components/ui/section-tabs.tsx` | `h-11` |
| `src/components/ui/page-header.tsx` | "Volver" de 44 px |
| `src/components/ui/card.tsx` | `CardTitle` a 16 px |
| `src/components/shared/SegmentedField.tsx` | `min-h-11` |
| `src/components/shared/Field.tsx`, `SelectField.tsx` | Error a `text-sm` |
| `src/components/ui/theme-toggle.tsx`, `src/app/AppShell.tsx` | Área tocable de 44 px, `active:` en la hoja "Más" |
| `src/features/cards/UtilizationBar.tsx`, `utilization.ts` | Barra y umbral únicos para las tres pantallas |
| `src/features/cards/CardDetailPage.tsx` | Pago próximo y jerarquía del corte; `dl` del saldo |
| `src/features/cards/CardsPage.tsx` | Usa el umbral del usuario |
| `src/features/dashboard/DashboardPage.tsx` | Filas de tarjeta enlazadas, uso unificado, ingresos en dos líneas, totales a 14 px |
| `src/features/dashboard/CashflowChart.tsx` | Fechas plegadas en móvil, texto más grande |
| `src/features/purchases/PurchaseDetailDialog.tsx` | Progreso del plan y `dl` válido |
| `src/features/purchases/PurchasesPage.tsx` | "MSI n/m", monto con formato, estado vacío, acciones sin `div` |
| `src/features/purchases/PurchaseFormDialog.tsx` | "Agregar comisión" tocable |
| `src/features/income/IncomePage.tsx` | Acciones del calendario al "⋯" |
| `src/lib/dates.ts` | `dayDiff` y `relativeDay` compartidos |

## 7. Decisiones

- **Un solo umbral de uso.** `utilizationLevel` recibe el `maxUtilizationBps`
  del usuario; la pantalla lo lee una vez con `useMaxUtilizationBps` y lo pasa a
  cada fila (un hook por fila sería ilegal dentro de un `map`).
- **Animación solo de entrada y solo con transform/opacity.** Cerrar es
  inmediato; la regla global de `prefers-reduced-motion` ya la desactiva.
- **`refetchOnWindowFocus` vuelve a `true`.** `staleTime` de 30 s evita que el
  cambio de pestaña dispare una ráfaga de consultas.
- **Sin gestos nuevos.** El asa de la hoja sigue siendo visual; arrastrar para
  cerrar queda fuera (habría que capturar el gesto y medir el umbral).

## 8. Fuera de alcance

Swipe para cerrar hojas, gestos de fila, hápticos, pull-to-refresh, chips de
filtro, formulario de tarjeta en dos pasos, degradado izquierdo de pestañas y el
próximo pago en la tarjeta de la lista de Tarjetas (la API de lista no lo
devuelve).

## 9. Verificación

- `npm.cmd run lint` sin avisos.
- `npm.cmd run build` correcto.
- `npm.cmd run test`: 39 archivos, 178 pruebas (5 nuevas: `ref` de
  `MoneyInput`, fila informativa, teclado del menú, umbral de uso con dos
  configuraciones).
- Pendiente: `npm.cmd run test:e2e` (reinicia `Cuentas_Test`) y la pasada visual
  a 375 px con la app levantada.
- No verificable aquí: iPhone físico (F2, teclado sobre el pie de las hojas),
  lector de pantalla real y la PWA instalada volviendo del fondo (N1).
