# Fase 34 — Color con significado (bloque B de la auditoría)

## 1. Objetivo

Aplicar el bloque B de la [auditoría UX/UI](auditoria-ux-ui.md): la paleta no
cambia de dirección; cambia **dónde se usa el color**. El rojo deja de significar
"gasto" y el verde deja de significar "número positivo".

## 2. Regla que queda

| Color | Significa | Ya no significa |
|---|---|---|
| Rojo (`danger`) | vencido, bajo el colchón, saldo negativo, error | un gasto o un pago programado |
| Verde (`income` / `success`) | entrada de dinero, estado confirmado | un saldo mayor a cero, el estado por defecto |
| Ámbar (`warning`) | aviso, línea del colchón | adorno |
| Tinta (`expense`) | salida de dinero | — |

`MoneyDisplay colored` queda reservado para **flujos** (entradas y salidas). En
saldos y costos no se usa: el saldo negativo se marca con `text-danger`.

## 3. Qué cambia para el usuario

| # (auditoría) | Antes | Ahora |
|---|---|---|
| UI-1 | Todo pago próximo, gasto y recurrente en rojo | En tinta; con signo cuando es una salida |
| UI-2 | "Flujo mínimo" verde si era > 0, aunque el badge dijera "Por debajo del colchón" | Rojo si queda bajo el colchón; tinta si no |
| UI-3 | Saldo de cada cuenta en verde | En tinta; rojo solo si es negativo |
| UI-10 | Botones deshabilitados al 55 % de opacidad (2.76:1 en el primario claro) | Fondo `surface-strong` y texto `ink-muted` (4.10:1 claro, 4.83:1 oscuro) |
| UI-12 | Movimientos: badge verde en cada entrada, además del monto verde | Badge de tipo siempre neutro |
| UI-13 | Badge verde "Activa" / "Activo" en cada cuenta, tarjeta, recurrente y fuente | Solo se marca la excepción ("Inactiva", neutro) |
| UI-14 | Estrella del recomendador en ámbar | En `brand-ink` |
| UI-20 | Borde de tarjeta `#e6e4dd` (1.27:1 sobre la superficie) | `#dedbd1` (1.39:1) |

También: el costo de intereses (recomendador y detalle de corte) salía **verde**
por ser positivo; ahora va en tinta.

## 4. Cambios

| Archivo | Cambio |
|---|---|
| `src/index.css` | `--color-expense` = tinta en ambos temas (`#211f1c` / `#e9edf4`); `--color-line` = `#dedbd1` |
| `src/components/ui/button-variants.ts` | Estado deshabilitado por variante, sin `opacity-55` |
| `src/features/dashboard/DashboardPage.tsx` | Mínimo según `belowBuffer`; estrella en `brand-ink`; variación de gasto al alza en `text-danger` |
| `src/features/dashboard/CashflowChart.tsx` | Mínimo según `belowBuffer`; saldo negativo de la tabla en `text-danger` |
| `src/features/dashboard/CashflowDayDetail.tsx` | Saldo al cierre negativo en `text-danger` |
| `src/features/accounts/AccountsPage.tsx`, `src/features/cards/CardsPage.tsx` | Sin `colored` en el saldo; badge de estado solo si no es `ACTIVE` |
| `src/features/movements/MovementsPage.tsx` | Badge de tipo neutro |
| `src/features/expenses/RecurringPage.tsx`, `src/features/income/IncomePage.tsx` | Solo badge "Inactivo/Inactiva" |
| `src/features/recommendations/RecommendationResultView.tsx`, `src/features/cards/StatementDetailDialog.tsx` | Costos sin `colored`; flujo mínimo negativo en `text-danger` |

## 5. Decisiones

- **`--color-expense` repite el HEX de `ink` en vez de usar `var(--color-ink)`.**
  `design-tokens-contrast.test.ts` lee los tokens como HEX; con `var()` el par
  "montos de gasto" dejaría de verificarse.
- **El token `expense` se conserva.** Las clases `text-expense` y `fill-expense`
  siguen diciendo "esto es una salida"; si algún día se quiere otro tono, se cambia
  en un solo lugar.
- **Donde `text-expense` quería decir "esto va mal" se cambió a `text-danger`:**
  variación de gasto al alza y saldos negativos. Sin eso, el cambio de token los
  habría dejado en tinta.
- **Las barras de salidas de la gráfica quedan en tinta.** La dirección (arriba
  entradas, abajo salidas) ya las distingue; el verde queda como único acento.
- **El oscuro se queda azul medianoche.** El oscuro cálido es el bloque F.
- **`StatusBadge` no cambió.** "Activa" se oculta solo en las listas; en las
  pantallas de detalle el estado sigue visible.
- **`opacity-55` sigue en `Switch` y en las filas de `ActionMenu`.** No son
  botones con texto sobre color sólido, que era el caso ilegible.

## 6. Pruebas

| Archivo | Qué cubre |
|---|---|
| `src/lib/design-tokens-contrast.test.ts` | Par nuevo: texto de botón deshabilitado (`ink-muted` / `surface-strong`, 3:1). El par "montos de gasto" ahora verifica la tinta |
| `src/features/dashboard/dashboard.test.tsx` | Con `belowBuffer`, el mínimo lleva `text-danger` y nunca `text-income` |

## 7. Verificación

| Comando | Resultado (10 nov 2026) |
|---|---|
| `npm.cmd run lint` | sin hallazgos |
| `npm.cmd run build` | correcto |
| `npm.cmd run test` | 38 archivos, 171 pruebas, todas pasan |
| `npm.cmd run test:e2e` | 4 pruebas pasan (corrido con las fases 33 a 35 ya aplicadas) |

Validación en pantalla (API local contra `Cuentas_Test`, 375 × 812): Inicio,
gráfica, Movimientos y Cuentas en claro; Inicio y Movimientos en oscuro. No se
vio en pantalla un caso "bajo el colchón" ni un saldo negativo (el usuario de
prueba no los tiene): esos dos los cubre la prueba unitaria del tablero.
