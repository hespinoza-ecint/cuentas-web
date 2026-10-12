# Fase 24 — Línea de tiempo de la proyección (API)

Fecha: 2026-10-12. Ámbito: `cuentas-api` (sin cambios de contrato destructivos).

## Contexto

El flujo de efectivo, el dashboard y el recomendador comparten
`CashflowContextService.buildBase`. Los ingresos y gastos se recortaban al
horizonte solicitado, pero las obligaciones de tarjeta (cortes, mensualidades
de hasta 48 meses, anualidad) entraban completas:

- el motor de recomendaciones comparaba ingresos de 60 días contra años de
  obligaciones → mínimo falso-negativo → descartaba tarjetas y la opción de
  efectivo (bug heredado de la fase 17, corregido allí solo para la pantalla
  del flujo);
- el dashboard sumaba años de mensualidades en una tarjeta que dice "30 días";
- los recurrentes pagados con tarjeta se proyectaban como salida de efectivo
  el día del cargo, y la anualidad como salida directa el día 1 del mes.

## Decisiones

### 1. Ventana por opción en el motor

Cada opción proyecta hasta `max(último pago de su plan, hoy + projectionMinDays)`.
Los eventos posteriores no cuentan para el mínimo.

- Alternativa descartada: alargar los ingresos hasta la última obligación;
  haría que todas las opciones se juzguen en ventanas distintas y premia
  artificialmente a los planes más largos.
- `projectionMinDays` se conserva como piso para no perder el "mira los
  próximos N días" del comportamiento anterior de las compras regulares.

### 2. `buildBase` recorta las obligaciones al horizonte

Coherente con lo que ya hacían ingresos y gastos: cada consumidor pide su
ventana (dashboard 30 días, proyección la del rango, motor la del plan) y
recibe solo esa rebanada.

### 3. Recurrente con tarjeta: fecha del corte, pero mismo tipo de evento

El evento se fecha en la fecha límite del corte que incluye el cargo (RN-13)
y se mantiene como `RECURRING_EXPENSE` con el nombre del recurrente.

- Alternativa descartada: un tipo de evento nuevo (`CARD_PURCHASE`); obliga a
  regenerar tipos del front y tocar las etiquetas de la gráfica sin aportar
  más información que la fecha correcta.

### 4. Anualidad por corte y multi-año

Una proyección por año dentro de la ventana, pagadera en la fecha límite del
corte que la cobra. Riesgo aceptado: si el usuario registra la anualidad a
mano en el libro, puede verse dos veces; la app nunca publica la anualidad
sola, así que no hay forma de detectarlo con certeza.

### 5. Sincronización sin escrituras no-op

`StatementsService.sync` corre en cada lectura; ahora solo escribe cuando los
campos calculados cambian. Menos I/O y menos contención con la transacción
del sync.

## Consecuencias operativas

- Los resultados del recomendador pueden cambiar (antes había falsos
  negativos por el horizonte).
- El JSON de ocurrencias de recurrentes gana `paymentMethod` y
  `creditCardId` (aditivo).
- Sin migración de esquema.
