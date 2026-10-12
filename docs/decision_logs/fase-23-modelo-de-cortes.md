# Fase 23 — Modelo de cortes (API): pago para no generar intereses y anticipos

Fecha: 2026-10-12. Ámbito: `cuentas-api` (sin cambios de contrato para la PWA).

## Contexto

La revisión de lógica encontró cuatro fallas del modelo de dinero:

1. El exigible del corte se calculaba neto de lo pagado en las mensualidades y
   ese mismo pago contaba otra vez en `paidAmount`, así que un corte podía
   quedar PAGADO debiendo dinero.
2. Los pagos del ciclo abierto (antes del corte) quedaban revolventes sin
   dueño y el corte siguiente los ignoraba.
3. Flujo y dashboard sumaban todos los cortes no pagados, aunque el más
   reciente ya incluye el saldo anterior (deuda contada doble).
4. Las compras del ciclo abierto no aparecían en la proyección.

## Decisiones

### 1. Exigible bruto (se vuelve al texto de RN-17)

`noInterestPaymentCalc = cargos regulares + mensualidades del corte (monto
completo) + saldo anterior no cubierto`. `paidAmount` es la suma de
asignaciones vigentes y PAGADO ⟺ pagado ≥ exigible.

- Alternativa descartada: calcular el exigible neto y excluir las asignaciones
  de mensualidades de `paidAmount`. Funciona en el caso simple, pero obliga a
  mezclar dos definiciones de "pagado" entre `sync` y `applyPaymentAllocations`
  (que compara `exigible − paidAmount` para saber cuánto falta).
- Consecuencia visible: un corte parcialmente pagado muestra el exigible
  completo y el avance por separado; la pantalla ya funcionaba así.

### 2. Los anticipos se adoptan al materializar el corte (RN-23)

En cada `sync`, las asignaciones huérfanas (`statementId = null`) se abonan al
corte más antiguo con saldo: primero las ligadas a mensualidades facturadas en
ese corte y luego el crédito genérico. Si el crédito excede lo exigible, la
asignación se divide y el sobrante queda para el siguiente corte.

- Alternativa descartada: aplicar el pago en el momento (a un corte "virtual").
  Requeriría cortes futuros materializados y permitiría pagos contra cortes que
  aún no existen.
- Consecuencia: el sobrante del pago se conserva como revolvente y se consume
  en cortes posteriores; nada de dinero "desaparece".

### 3. Una sola deuda por tarjeta + corte próximo proyectado

Flujo y dashboard usan el **último corte no pagado** (en su fecha límite) más
una obligación por el **corte próximo a cerrar** (cargos del ciclo abierto +
mensualidades que se facturarán − anticipos disponibles). Antes: se sumaban
todos los cortes no pagados y el ciclo abierto no aparecía.

### 4. Cambiar `cutDay` con historial queda bloqueado

`422 CUT_DAY_LOCKED` si existen cortes o mensualidades. Alternativa pospuesta:
recalcular cortes y remapear `statementCutDate` de las mensualidades (fase
posterior si hace falta).

### 5. Fuera de alcance (pospuesto)

- Registrar los intereses/IVA de planes diferidos como entradas `INTEREST`/
  `FEE` del libro al facturar (hoy el libro solo carga el principal): merece su
  propia fase con pruebas de liquidación.
- Reversos de pagos con fecha del periodo original (hoy el reverso se fecha
  hoy). El recálculo de cortes ya es consistente tras el siguiente `sync`.

## Consecuencias operativas

- Sin migración de esquema; los datos existentes se recalculan al consultar.
- Un corte que aparecía PAGADO puede volver a mostrar saldo: es el estado real.
- `card-ledger` escribe el saldo con `increment`/`decrement` (dos pagos
  simultáneos ya no se pisan); la pre-validación de "pago > saldo" sigue
  siendo optimista en concurrencia extrema.
