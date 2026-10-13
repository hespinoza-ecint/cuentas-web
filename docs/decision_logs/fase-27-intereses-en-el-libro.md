# Fase 27 — Intereses de diferidas en el libro (API)

Fecha: 2026-10-13. Ámbito: `cuentas-api` (sin cambios para la web).

## Contexto

El plan diferido cargaba solo el principal al libro, pero sus mensualidades
valen capital + interés + IVA (+ comisión): el saldo quedaba corto, podía
volverse negativo y liquidar el plan antes de facturar los intereses era
imposible.

## Decisiones

### 1. Publicar al facturar (y reconciliar), no al crear

Los cargos de `INTEREST`/`FEE` se publican cuando la mensualidad se factura
(es cuando el banco cobra el interés) y, si se paga antes de facturar, en el
siguiente sync. Se descartó cargar todo el interés al crear el plan: inflaría
el saldo con intereses no devengados y complicaría los cortes futuros.

- Idempotente por `(sourceId = mensualidad, tipo)`: los sync repetidos no
  duplican y los datos previos se nivelan solos.
- El historial "al corriente" (pagado fuera de la app) se excluye: no es deuda
  nueva.

### 2. El anticipo no se limita por el saldo

El tope correcto es el pendiente del plan (`PREPAYMENT_EXCEEDS_PLAN`); el
libro puede todavía no tener los intereses futuros. Pagar el pendiente
completo sube el saldo a 0 tras el siguiente sync (las entradas faltantes se
publican para las mensualidades pagadas).

### 3. Cancelar/eliminar revierten los intereses facturados

Con las entradas nuevas, cancelar o eliminar un plan sin incluirlas habría
dejado deuda fantasma en la tarjeta; ambas rutas ahora suman
`planInterestCharges` a lo revertido.

## Consecuencias

- El saldo de la tarjeta refleja la deuda real del plan en todo momento.
- Sin migración; los planes viejos se nivelan en la primera lectura de cortes,
  el dashboard o el flujo.
