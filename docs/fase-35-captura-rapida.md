# Fase 35 — Captura rápida (bloque C de la auditoría)

## 1. Objetivo

Aplicar el bloque C de la [auditoría UX/UI](auditoria-ux-ui.md): que registrar
un gasto o una compra desde el teléfono tome menos toques y que el alta de una
tarjeta no sea una hoja de 14 campos.

## 2. Qué cambia para el usuario

| # (auditoría) | Antes | Ahora |
|---|---|---|
| UX-6 | La hoja "Registrar" abría con el recomendador; "Gasto" era la 3.ª opción | Gasto, Compra con tarjeta, Ingreso, Pago de tarjeta; el recomendador va aparte, al final |
| UX-5 | Al abrir "Registrar gasto" o "Registrar compra" el foco caía en un `select` ya resuelto; el monto era el 4.º campo | El monto es el primer campo y recibe el foco |
| UX-9 | Compra: 7 campos en fila, "Tipo" como `select`, "Comisión" siempre visible | Tarjeta y fecha comparten renglón; "Tipo" es un control de tres opciones a un toque; la comisión queda plegada |
| UX-13 | Nueva tarjeta: 14 campos (1353 px de contenido) | 7 campos a la vista; tasa, anualidad y días inhábiles plegados; la fecha del saldo inicial aparece solo si hay saldo |

Toques para registrar un gasto desde cualquier pantalla: de 5 a 4 (＋ → Gasto →
Descripción → Registrar; el monto ya tiene el foco).

## 3. Cambios

| Archivo | Cambio |
|---|---|
| `src/app/QuickActions.tsx` | Opciones por frecuencia; enlaces con `ButtonLink` en vez de clases a mano |
| `src/components/shared/SegmentedField.tsx` | Nuevo: radios nativos con apariencia de control segmentado |
| `src/features/expenses/ExpenseFormDialog.tsx` | Orden: Monto, Descripción, [Cuenta · Fecha], Categoría, Notas |
| `src/features/purchases/PurchaseFormDialog.tsx` | Orden: Monto, Descripción, [Tarjeta · Fecha], Categoría, Tipo; comisión en `<details>` |
| `src/features/cards/CardFormDialog.tsx` | Identidad, límite, corte y fecha límite a la vista; el resto en `<details>` |
| `e2e/full-flow.spec.ts` | "Tipo" se elige tocando "MSI" (antes `selectOption`) |

## 4. Decisiones

- **El foco no se programa: se ordena.** Radix enfoca el primer elemento
  enfocable de la hoja; basta con que el monto sea el primer campo.
- **La fecha se queda a la vista en gasto y compra.** La auditoría proponía
  plegarla, pero la fecha de una compra decide en qué corte cae: un default
  silencioso ("hoy") para una compra de hace tres días la manda al corte
  equivocado. Comparte renglón con la cuenta o la tarjeta para no costar altura.
- **La categoría también se queda.** Alimenta "gastos por categoría" del Inicio;
  plegarla habría bajado la categorización.
- **En la tarjeta, corte y fecha límite no se pliegan** por la misma razón: definen
  los cortes. Se pliega solo lo que tiene un default razonable (tasa 0, sin
  anualidad, día hábil anterior).
- **Lo plegado se abre solo si tiene un error** (tarjeta) o si ya tiene valor
  (comisión), para que nunca haya un error invisible.
- **`SegmentedField` usa radios nativos.** Funciona con `register()` de
  react-hook-form sin `Controller`, y el teclado (flechas) y el lector de pantalla
  lo entienden sin ARIA adicional. Las etiquetas son cortas ("Regular", "MSI",
  "Diferida") para caber en 375 px; la descripción de la hoja las explica.
- **No se reemplazaron los otros dos "segmentados" hechos a mano** (ventanas de
  la gráfica y selector de tema): son grupos de botones con `aria-pressed` de los
  que dependen pruebas y E2E, y cambiarlos no aporta al usuario.

## 5. Fuera de esta fase

- **Descripción opcional** (auditoría, UX-5): la API exige descripción; requiere
  cambio de backend.
- **Ingreso único** (UX-14): `income-api.ts` solo confirma ocurrencias de una
  fuente con calendario; no hay endpoint para un ingreso suelto. Requiere backend.
- **Alta de tarjeta en dos pasos**: se resolvió con plegado, que da la misma
  reducción con menos código y sin estado de asistente.

## 6. Pruebas

| Archivo | Qué cubre |
|---|---|
| `src/app/app-shell-mobile.test.tsx` | Orden de la hoja "Registrar" (Gasto primero, recomendador al final); foco en el monto del gasto |
| `src/features/purchases/purchases.test.tsx` | Foco en el monto de la compra; "Tipo" como opción "MSI" |

## 7. Verificación

| Comando | Resultado (10 nov 2026) |
|---|---|
| `npm.cmd run lint` | sin hallazgos |
| `npm.cmd run build` | correcto |
| `npm.cmd run test` | 38 archivos, 171 pruebas, todas pasan |
| `npm.cmd run test:e2e` | **no se corrió** (el reset de `Cuentas_Test` requiere consentimiento explícito) |

**El E2E es el riesgo abierto de esta fase.** `e2e/full-flow.spec.ts` se editó
sin poder correrlo: la línea que elegía "Tipo" con `selectOption('MSI')` ahora
toca el texto "MSI". Hay que correrlo antes de dar la fase por cerrada.

Validación en pantalla (API local contra `Cuentas_Test`, 375 × 812, tema claro):

| Pantalla | Medido |
|---|---|
| Hoja "Registrar" | Gasto, Compra con tarjeta, Ingreso, Pago de tarjeta; recomendador al final |
| Registrar gasto | Foco en `expenseAmount`; hoja de 639 px (antes 721); sin scroll |
| Registrar compra | Foco en `purchaseAmount`; todo visible sin scroll (691 px; antes 801 px de contenido en 729); un toque en "MSI" muestra "Meses" y "Mes del primer corte" |
| Nueva tarjeta | 771 px de contenido (antes 1353); el pliegue "Tasa, anualidad y días inhábiles" queda 42 px bajo el pie fijo |

No se probó en pantalla: el envío de los formularios con los nuevos campos (lo
cubren las pruebas unitarias), el modo edición de la tarjeta ni el tema oscuro.
