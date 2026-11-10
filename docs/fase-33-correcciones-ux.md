# Fase 33 — Correcciones de UX (bloque A de la auditoría)

## 1. Objetivo

Aplicar el bloque A de la [auditoría UX/UI](auditoria-ux-ui.md): siete defectos
concretos de bajo riesgo, medidos en pantalla a 375 × 812, sin cambiar la
navegación ni la paleta.

## 2. Qué cambia para el usuario

| # (auditoría) | Antes | Ahora |
|---|---|---|
| UX-1 | En "Próximos pagos" la fecha se recortaba junto con la descripción | Fila de dos líneas: descripción arriba, "Tipo · fecha" abajo, siempre visible |
| UX-2 | En `/cuentas` la pestaña activa quedaba fuera de pantalla (x = 397–477) | La pestaña activa se centra al entrar (x = 279–359) y el borde derecho se desvanece para indicar que hay más |
| UX-4 | Las hojas solo se cerraban con Escape o tocando el velo | Botón "Cerrar" de 44 px arriba a la derecha en todos los diálogos |
| UX-8 | Campos "Desde/Hasta" de la gráfica: 26 px de alto, fuente de 12 px (zoom en iOS) | 42 px, 16 px, lado a lado en móvil |
| UX-18 | En hojas largas se asomaba contenido bajo el pie fijo | La franja queda cubierta |
| A3 | Sin forma de saltar la navegación con teclado | Enlace "Saltar al contenido" (visible al enfocarlo) hacia `main#contenido` |
| A4 | El texto de ayuda de un campo no se anunciaba | La ayuda se asocia con `aria-describedby` |

## 3. Cambios

| Archivo | Cambio |
|---|---|
| `src/features/dashboard/DashboardPage.tsx` | Fila de pago en dos líneas; el tipo pasa del badge a la línea secundaria |
| `src/components/ui/section-tabs.tsx` | Centra la pestaña activa (`scrollLeft`) al cambiar de ruta; máscara de desvanecido en móvil |
| `src/components/ui/dialog.tsx` | `DialogPrimitive.Close` después del contenido; `pr-10` en el título; sombra sólida en el pie |
| `src/features/dashboard/CashflowChart.tsx` | Los campos de fecha ya no anulan el tamaño de `controlClass`; rejilla de 2 columnas en móvil |
| `src/app/AppShell.tsx` | Enlace de salto y `id="contenido"` + `tabIndex={-1}` en `main` |
| `src/components/shared/Field.tsx`, `MoneyInput.tsx`, `TextareaField.tsx` | `id` en la ayuda y `aria-describedby={errorId ?? hintId}` |

## 4. Decisiones

- **El botón "Cerrar" va después del contenido en el DOM.** Radix enfoca el primer
  elemento enfocable al abrir: si el botón fuera primero, le quitaría el foco
  inicial al primer campo de cada formulario. Se posiciona con `absolute`, así que
  se desplaza con el contenido en hojas largas; los formularios conservan
  "Cancelar" en el pie fijo.
- **El pie fijo se cubre con una sombra, no moviendo el `bottom`.** Medido en
  Chromium: mientras está pegado, el pie se detiene en la caja de contenido de la
  hoja (20 px antes del borde, por el `pb-5`). Un `bottom` negativo lo corregiría
  ahí pero lo sacaría de pantalla en un navegador que mida contra el borde del
  relleno; la sombra sólida de 1.25rem funciona en ambos casos.
- **"Cuentas" sigue en el módulo Movimientos.** La auditoría propone sacarla, pero
  cambia `nav.ts` y las etiquetas de las que depende `e2e/mobile.spec.ts`; queda
  para el bloque E.
- **Sin "en N días" en la fila de pago.** `lib/dates.ts` no tiene diferencia de
  días y no se agregó un helper para un solo uso.
- **La ayuda y el error no se anuncian juntos.** La ayuda ya se oculta cuando hay
  error; `aria-describedby` sigue esa misma regla.

## 5. Pruebas

| Archivo | Qué cubre |
|---|---|
| `src/components/ui/ui-primitives.test.tsx` | Botón "Cerrar" y foco inicial en el primer campo; ayuda asociada al campo; pestaña activa centrada (medidas simuladas: jsdom no calcula layout) |
| `src/features/dashboard/dashboard.test.tsx` | La línea "Tipo · fecha" no lleva `truncate`; "Hasta" no lleva `text-xs` |
| `src/app/app-shell-mobile.test.tsx` | Enlace "Saltar al contenido" y `main#contenido` |

Validación en pantalla (API local contra `Cuentas_Test`, 375 × 812, tema claro):
los siete cambios se revisaron con un usuario de prueba.

## 6. Verificación

| Comando | Resultado (10 nov 2026) |
|---|---|
| `npm.cmd run lint` | sin hallazgos |
| `npm.cmd run build` | correcto |
| `npm.cmd run test` | 38 archivos, 171 pruebas, todas pasan |
| `npm.cmd run test:e2e` | 4 pruebas pasan (corrido con las fases 33 a 35 ya aplicadas) |

Nota para quien lo corra con un agente de IA: el arranque del E2E resetea
`Cuentas_Test` con `prisma db push --force-reset` y Prisma bloquea ese comando
hasta que el usuario da su consentimiento explícito.
