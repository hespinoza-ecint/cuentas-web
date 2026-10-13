# Fase 29 — Montos sugeridos al registrar un pago

## 1. Objetivo

Al registrar un pago de tarjeta ya no hay que capturar el monto a mano: al
elegir la tarjeta, el formulario ofrece botones con los montos que importan
del último corte pendiente y un toque llena el campo Monto (que sigue siendo
editable).

- **Total del corte**: pago para no generar intereses (el reportado por el
  banco o, si no hay, el calculado) menos lo ya pagado. Es la misma cifra que
  el "Pago pendiente" del dashboard.
- **Pago mínimo**: mínimo reportado o estimado menos lo ya pagado; se omite
  cuando es igual al total del corte o ya no queda nada por pagar.
- **Saldo total**: la deuda completa de la tarjeta hoy (incluye lo aún no
  cortado).

## 2. Cambios

| Archivo | Cambio |
|---|---|
| `src/features/payments/payment-suggestions.ts` | Nuevo: `paymentSuggestions(statements, card)` toma el corte pendiente más reciente (la misma regla del dashboard: el más nuevo ya incluye el saldo anterior) y arma las opciones con montos derivados por diferencia, nunca negativos ni repetidos |
| `src/features/payments/PaymentFormDialog.tsx` | Consulta `GET /cards/{id}/statements` con la llave `['statements', id]` (la misma del detalle de tarjeta) y muestra la línea de contexto ("Corte 15 oct 2026 · vence 4 nov 2026" o "Sin corte pendiente") y la fila de botones; el botón cuyo monto coincide con el capturado queda marcado (`aria-pressed`) |
| `src/features/payments/payment-suggestions.test.ts` | Nuevo: casos del cálculo |
| `src/features/payments/payments.test.tsx` | Prueba de punta a punta: elegir "Total del corte" llena el monto y el POST lo envía en centavos; sin corte pendiente solo se ofrece el saldo total |

Mientras los cortes cargan, si la consulta falla o si la tarjeta no tiene
nada que ofrecer, la fila no aparece y el formulario funciona como antes.

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/payments/payment-suggestions.test.ts src/features/payments/payments.test.tsx --maxWorkers=1
```

- el monto reportado por el banco gana al calculado y se le descuenta lo
  pagado (también al mínimo, con el reportado preferido sobre el estimado);
- se toma el corte pendiente más reciente aunque la lista venga en otro
  orden y se ignoran los cortes pagados;
- sin cortes (o todos pagados) solo se ofrece el saldo total, y sin deuda no
  hay botones;
- el mínimo se omite si repite el total del corte y ningún monto en cero se
  ofrece;
- en el diálogo: el toque llena "Monto" (1800.00 en el caso de la prueba) y
  el pago se registra por 180000 centavos.

## 4. Compatibilidad

- Sin cambios en la API: se reutilizan `GET /api/v1/cards/{id}/statements` y
  su caché compartida con el detalle de tarjeta; registrar un pago ya
  invalidaba esa llave.
- El campo Monto conserva su captura manual y su validación (mayor a cero);
  los botones solo escriben el valor, no envían nada.
- La guardia de cambios del formulario funciona igual: elegir un monto
  cuenta como edición.
