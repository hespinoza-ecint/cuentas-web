# Auditoría UX/UI y de diseño visual — Cuentas (PWA)

Fecha: 10 de noviembre de 2026 · Alcance: `cuentas-web` · Prioridad: móvil.

## 0. Resumen ejecutivo

1. **La base es buena y no hay que rehacerla.** El sistema de color por tokens, las pruebas de
   contraste, las hojas inferiores, las áreas seguras y la barra inferior con "＋" están por
   encima de lo habitual. Todo el texto pasa WCAG AA en claro y oscuro (mínimo medido 4.88:1).
2. **El problema no es la paleta, es dónde se usa el color.** El rojo significa "gasto" y también
   "problema"; el verde significa "ingreso" y también "saldo positivo". Resultado: una lista de
   pagos normales se ve como una lista de errores.
3. **El Inicio no responde primero lo que el usuario pregunta primero.** A 375 px, lo que se ve sin
   desplazar es: saludo, dos cifras del mismo tamaño y una promo del recomendador. "¿Qué tengo que
   pagar y cuándo?" empieza en el borde inferior y **la fecha de pago sale recortada**.
4. **Capturar es más largo de lo necesario.** El monto es el 4.º campo, el foco cae en un `select`
   que ya trae el valor correcto y la hoja "Registrar" abre con una opción que no registra nada.
5. **Hay cuatro defectos concretos que arreglar ya** (sección 8, UX-1 a UX-4): fecha de pago
   recortada, pestaña activa fuera de pantalla, campos de fecha de 26 px con fuente de 12 px y hojas
   sin botón de cerrar.

### Método y límites

- **Código:** tokens (`src/index.css`), shell y navegación, Inicio, gráfica de flujo, formularios
  de captura, listas y primitivas de `src/components/ui`.
- **Contraste:** calculado por script sobre los HEX reales de ambos temas (fórmula WCAG 2.x).
- **En pantalla:** la app corrió en local contra `Cuentas_Test` a 375 × 812 con un usuario de
  prueba y datos mínimos (1 cuenta, 1 gasto, 1 tarjeta, 1 compra). Se vieron en claro: Inicio
  (vacío y con datos), hoja "Registrar", formularios de cuenta, gasto, tarjeta y compra, Cuentas,
  Tarjetas, Recurrentes y Movimientos. En oscuro: Inicio.
- **No se validó:** escritorio, dispositivo físico (el zoom de iOS se infiere del tamaño de fuente
  medido), lector de pantalla real, detalle de tarjeta, Compras, Pagos, Recomendador, Ingresos con
  datos ni listas largas. Los hallazgos de esas zonas son por lectura de código.
- Las menciones a Copilot Money, Monarch, Rocket Money y YNAB son patrones conocidos de esas
  apps, no una revisión hecha hoy.

Las medidas en px de este documento son del viewport 375 × 812.

---

## 1. Diseño visual y color

### 1.1 Veredicto

**La paleta se queda.** La dirección "estado de cuenta" (papel cálido, tinta, azul `#1e46c8`)
es distintiva y sobria; cambiarla por un azul-verde "fintech genérico" sería un retroceso.
Lo que cambia son seis decisiones de **uso**.

### 1.2 Contraste medido (tokens actuales)

| Par | Claro | Oscuro | Criterio |
|---|---|---|---|
| `ink` / `canvas` | 15.07 | 15.71 | texto 4.5 ✅ |
| `ink-secondary` / `canvas` | 7.14 | 9.95 | ✅ |
| `ink-muted` / `canvas` | **4.88** | 7.15 | ✅ (el más justo) |
| `ink-muted` / `surface-subtle` | 4.59 | 5.81 | ✅ |
| `ink-muted` / `surface-strong` | **4.10** | 4.83 | ❌ claro si se usa como texto |
| `on-brand` / `brand` | 7.59 | 8.09 | ✅ |
| `success` / `surface` | 5.35 | 9.56 | ✅ |
| `danger` / `surface` | 6.54 | 7.08 | ✅ |
| `warning` / `surface` | 5.78 | 8.59 | ✅ |
| `on-accent` / `danger-solid` | 6.54 | 4.98 | ✅ |
| `line-strong` / `surface` (bordes de campo) | 3.60 | 4.04 | UI 3.0 ✅ |
| `line` / `surface` (borde de tarjeta) | 1.27 | 1.33 | decorativo |
| `surface` / `canvas` | 1.09 | 1.09 | decorativo |
| Botón primario deshabilitado (`opacity-55`) | **2.76** | 3.34 | exento, pero ilegible |
| Tramo de gráfica `chart-line` vs `danger` | **1.16** | **1.05** | ❌ señal solo por tono |

### 1.3 Colores que hoy generan ruido

| # | Qué pasa | Dónde | Cambio |
|---|---|---|---|
| C1 | **Rojo = gasto.** Cada pago próximo, cada gasto recurrente y cada salida van en rojo aunque todo esté en orden. El rojo deja de avisar. | `--color-expense` (`index.css:114`), `DashboardPage.tsx:204`, `RecurringPage.tsx:175,269`, `MovementsPage.tsx:195` | `--color-expense` pasa a tinta. Rojo solo para vencido, bajo el colchón y errores. |
| C2 | **Verde = número positivo.** El saldo de una cuenta y el "flujo mínimo" salen verdes solo por ser > 0. En Inicio, "$6,749.50" en verde junto a un badge que puede decir "Por debajo del colchón" son señales opuestas. | `MoneyDisplay colored` (`MoneyDisplay.tsx:12-18`), `DashboardPage.tsx:120` | En saldos, sin color. El color del mínimo lo decide `belowBuffer`, no el signo. `colored` queda solo para flujos (entradas/salidas). |
| C3 | **Badge + monto duplican el mismo código.** En Movimientos toda entrada lleva badge verde y además monto verde. | `MovementsPage.tsx:181` | Badge neutro siempre; el signo y el monto ya lo dicen. |
| C4 | **`warning` como adorno.** La estrella del recomendador es ámbar sin que haya aviso. | `DashboardPage.tsx:156` | `text-brand-ink`. Ámbar solo para avisos y para el colchón. |
| C5 | **Estados por defecto con color.** "Activa" / "Activo" en verde en cada tarjeta, cuenta y recurrente. | listas de Cuentas, Tarjetas, `RecurringPage.tsx:254` | Mostrar solo la excepción ("Inactiva", neutro). |
| C6 | **Oscuro frío contra acceso cálido.** La app oscura es azul medianoche (`#0f141d`); acceso, carga y 404 son carbón cálido (`#1a1915`). En tema claro, la pantalla de carga además parpadea en oscuro entre páginas. | `index.css:64,136`, `LoadingScreen.tsx` | Oscuro cálido (tabla 1.5). La carga usa `canvas` del tema activo. |

### 1.4 Paleta — modo claro

Todos los ratios son contra `surface #ffffff` salvo que se indique.

| Rol | Token | Actual | Propuesto | Ratio | Decisión |
|---|---|---|---|---|---|
| **Primario** | `brand` | `#1e46c8` | `#1e46c8` | 7.59 | se queda |
| Primario hover | `brand-hover` | `#1738a6` | `#1738a6` | 9.76 (texto blanco encima) | se queda |
| Primario suave | `brand-soft` | `#e9edfa` | `#e9edfa` | — | se queda |
| Primario texto | `brand-ink` | `#1c3fb8` | `#1c3fb8` | 7.32 sobre `brand-soft` | se queda |
| Foco | `focus` | `#3f63e0` | `#3f63e0` | 5.16 / 4.73 sobre canvas | se queda |
| **Secundario** (botón contorno) | `ink-secondary` + `line-strong` | `#55524b` / `#8b8779` | igual | 7.79 / 3.60 | se queda |
| **Éxito** | `success` | `#0e7a52` | `#0e7a52` | 5.35 | se queda |
| Éxito suave / texto | `success-soft` / `success-ink` | `#e6f3ec` / `#0b5c3e` | igual | 7.04 | se queda |
| **Aviso** | `warning` | `#8f5a06` | `#8f5a06` | 5.78 | se queda |
| Aviso suave / texto | `warning-soft` / `warning-ink` | `#f9f0dd` / `#74500a` | igual | 6.40 | se queda |
| **Peligro** | `danger` | `#b3261e` | `#b3261e` | 6.54 | se queda |
| Peligro suave / texto | `danger-soft` / `danger-ink` | `#fbeceb` / `#8f1f18` | igual | 7.70 | se queda |
| Informativo | `info` / `info-soft` / `info-ink` | `#0f5f96` / `#e8f2f9` / `#0c4c78` | igual | 6.78 / 7.97 | se queda |
| **Neutro** fondo | `canvas` | `#f6f5f1` | `#f6f5f1` | — | se queda |
| Neutro superficie | `surface` | `#ffffff` | `#ffffff` | — | se queda |
| Neutro suave | `surface-subtle` | `#efeee9` | `#efeee9` | — | se queda |
| Neutro fuerte | `surface-strong` | `#e3e2db` | `#e3e2db` | — | se queda |
| Divisor | `line` | `#e6e4dd` | **`#dedbd1`** | 1.39 (antes 1.27) | cambia: las tarjetas apenas se separan del fondo |
| Borde de campo | `line-strong` | `#8b8779` | `#8b8779` | 3.60 | se queda |
| Texto | `ink` | `#211f1c` | `#211f1c` | 16.44 | se queda |
| Texto secundario | `ink-secondary` | `#55524b` | `#55524b` | 7.79 | se queda |
| Texto atenuado | `ink-muted` | `#6e6b62` | `#6e6b62` | 5.33 (4.88 canvas) | se queda |
| Ingreso | `income` | `#0e7a52` | `#0e7a52` | 5.35 | se queda |
| **Gasto** | `expense` | `#b3261e` | **`#211f1c`** | 16.44 | **cambia** (C1) |
| Rejilla de gráfica | `chart-grid` | `#d8d5cb` | **`#c4c0b3`** | 1.82 (antes 1.47, y se pinta al 45 %) | cambia |
| Deshabilitado | — | `opacity-55` | fondo `#e3e2db`, texto `#6e6b62` | 4.10 (antes 2.76) | cambia, sin token nuevo |

### 1.5 Paleta — modo oscuro (cálido, opcional)

Es una decisión de coherencia, no de accesibilidad: el oscuro actual pasa AA. Ratios contra la
`surface` propuesta `#1c1b18`.

| Rol | Token | Actual | Propuesto | Ratio |
|---|---|---|---|---|
| Fondo | `canvas` | `#0f141d` | `#141311` | — |
| Superficie | `surface` | `#161d2a` | `#1c1b18` | — |
| Suave | `surface-subtle` | `#1e2737` | `#262521` | — |
| Fuerte | `surface-strong` | `#29344a` | `#33312c` | — |
| Divisor | `line` | `#273349` | `#2f2d28` | 1.25 |
| Borde de campo | `line-strong` | `#6b7d99` | `#7f7b6f` | 4.07 |
| Texto | `ink` | `#e9edf4` | `#eceae4` | 14.32 |
| Texto secundario | `ink-secondary` | `#b6bfcd` | `#bdb9ae` | 8.79 |
| Texto atenuado | `ink-muted` | `#96a2b5` | `#9d998d` | 6.05 (5.39 sobre suave) |
| Primario | `brand` | `#8fa8ff` | `#8fa8ff` | 7.56 |
| Texto sobre primario | `on-brand` | `#0f141d` | `#141311` | 8.15 |
| Primario suave / texto | `brand-soft` / `brand-ink` | `#1d2745` / `#a3b6ff` | `#1f2640` / `#a3b6ff` | 7.59 |
| Éxito / suave / texto | `success` | `#3ddc97` / `#0d2b22` / `#7ce7b4` | `#3ddc97` / `#10291f` / `#7ce7b4` | 9.75 / 10.26 |
| Aviso / suave / texto | `warning` | `#e5b13a` / `#29220d` / `#f2cd7a` | `#e5b13a` / `#2a220e` / `#f2cd7a` | 8.76 / 10.34 |
| Peligro / suave / texto | `danger` | `#f28b84` / `#33161a` / `#f7a9a3` | `#f28b84` / `#33181a` / `#f7a9a3` | 7.22 / 8.67 |
| Peligro sólido | `danger-solid` | `#cc3a31` | `#cc3a31` | 4.98 (texto blanco) |
| Informativo / suave / texto | `info` | `#67b8ef` / `#0c2132` / `#9ed3f7` | `#67b8ef` / `#10222f` / `#9ed3f7` | 7.94 / 10.15 |
| Gasto | `expense` | `#f28b84` | `#eceae4` | 14.32 |
| Rejilla de gráfica | `chart-grid` | `#33405a` | `#45423b` | 1.72 |

Al cambiar tokens: actualizar `theme-color` en `index.html:18,48` (`#141311`) y los pares de
`src/lib/design-tokens-contrast.test.ts`.

---

## 2. Jerarquía de información

### 2.1 Qué debe verse primero

Orden por la pregunta que responde, no por el módulo que la produce:

1. **¿Cuánto tengo y me alcanza?** — disponible + margen sobre el colchón.
2. **¿Qué tengo que pagar y cuándo?** — próximos 7 días, con fecha visible.
3. **¿Cómo van mis tarjetas?** — la que vence antes, primero.
4. **¿Cómo viene el mes?** — gráfica de flujo y gasto contra el mes anterior.

### 2.2 Qué se ve hoy (Inicio, medido)

| Bloque | Inicio (y) | Alto | ¿Sobre el pliegue (754 px)? |
|---|---|---|---|
| Saludo + fecha | 77 | ~54 | sí |
| Efectivo disponible | 147 | 140 | sí |
| Flujo mínimo proyectado | 303 | 176 | sí |
| ¿Con qué tarjeta pago? | 495 | 120 | sí |
| Próximos pagos (30 días) | 631 | 121 | solo título y 1 fila |
| Tarjetas de crédito | 768 | 192 | no |
| Flujo de efectivo proyectado | 976 | **686** | no (1.3 pantallas abajo) |
| Próximos ingresos | 1678 | 104 | no |
| Gastos del mes | 1798 | 116 | no (última pantalla de 2.7) |

Problemas:

- **Dos héroes.** "Efectivo disponible" y "Flujo mínimo proyectado" usan `text-3xl font-semibold`
  (`DashboardPage.tsx:87,119`). Sin un punto focal, el ojo rebota.
- **Cifras repetidas.** "$23,149.50" y debajo "Total en 1 cuenta: $23,149.50"
  (`DashboardPage.tsx:90-94`). El mínimo proyectado y el rango de fechas aparecen arriba y otra
  vez dentro de la tarjeta de la gráfica (`CashflowChart.tsx:229-233,288-294`).
- **Un anuncio permanente en el tercer lugar.** El recomendador ocupa 120 px fijos aunque ya es la
  primera opción del "＋".
- **Tarjetas dentro de tarjetas.** Cada tarjeta de crédito es una caja con borde dentro de la
  `Card` (`DashboardPage.tsx:250`): dos bordes, dos radios, dos rellenos.
- **El saludo gasta el mejor renglón.** "Hola, Auditoria" no es información.

### 2.3 Tipografía: escala comprimida

Uso real en `src/**` (sin pruebas): `text-sm` 104, `text-xs` 93, `text-2xs` 13, `text-base` 8,
`text-lg` 3, `text-2xl` 5, `text-3xl` 3. `CardTitle` es `text-sm font-semibold` (`card.tsx:15`):
**el título de sección mide lo mismo que el cuerpo** y se distingue solo por peso. Casi la mitad
del texto de la app está en 12 px atenuado.

### 2.4 Tarjetas y espaciado

- Listas: cada `ListRow` es una tarjeta completa (borde + sombra + radio, `list-row.tsx:34`) con
  8 px entre filas. Diez filas son diez cajas. **Una sola tarjeta con divisores** (como ya hace
  Inicio con `divide-y divide-line`) reduce ruido y deja ver ~1 fila más por pantalla.
- Entre secciones del Inicio hay 16 px, igual que dentro de ellas. Propuesta: 24 px entre
  secciones, 12 px dentro.
- Los campos llevan `shadow-card` (`control.ts:10`): se ven elevados como tarjetas. Un campo es un
  hueco, no un relieve: quitar la sombra.

---

## 3. UX móvil

### 3.1 Navegación

**Funciona:** cinco destinos en la barra inferior (58 px de alto, 75 px de ancho cada uno), "＋"
central de 56 px, módulos con pestañas. No cambiar la estructura.

**Falla:**

- **Pestaña activa fuera de pantalla (medido).** En `/cuentas` la pestaña "Cuentas" queda en
  x = 397–477 de un viewport de 375. El usuario ve "Movimientos · Gastos · Ingresos · Recurrente…"
  sin ninguna marcada. La barra de scroll está oculta (`section-tabs.tsx:25`) y no hay degradado
  que indique que hay más. Arreglo: `scrollIntoView({ inline: 'center' })` de la activa al montar
  y máscara de desvanecido en el borde derecho.
- **Cinco pestañas donde caben cuatro.** "Cuentas" no es un movimiento. Sacarla del módulo
  (hoja "Más" → Dinero, o enlace desde el héroe del Inicio) deja cuatro pestañas que casi caben.
- **40 % de la pantalla antes del primer dato (medido en Movimientos).** Cabecera 57 + pestañas 40
  + título y descripción ~60 + botón 36 + filtros 54: la primera fila empieza en y = 321.
- **La cabecera móvil no aporta.** Logo + nombre + cambio de tema (`AppShell.tsx:79-87`). El tema
  ya está en "Más". En móvil la cabecera debería llevar el título de la pantalla; así se elimina
  el `h1` duplicado y se ganan ~60 px.
- **La acción principal de Movimientos es "Ajuste manual"** (`MovementsPage.tsx:98-104`), un botón
  primario a todo el ancho para la operación menos frecuente de la pantalla.

### 3.2 Tareas frecuentes: toques hoy y propuestos

Toques sin contar teclear. "Hoy" verificado en pantalla salvo donde se indica.

| Tarea | Hoy | Propuesto | Cómo |
|---|---|---|---|
| **Registrar gasto** | 5 — ＋ → Gasto (3.ª opción) → tocar Descripción → tocar Monto → Registrar | **3** — ＋ → Gasto (1.ª) → [monto ya enfocado] → Registrar | Monto primero y con foco; descripción opcional (si va vacía, usa la categoría) |
| **Registrar ingreso** | 4 — ＋ → Ingreso → Confirmar → Confirmar (por código) | **2** desde Inicio | Botón "Confirmar" en la fila de "Próximos ingresos" cuando la fecha ya llegó |
| **Compra con tarjeta** | 5 + desplazar — ＋ → Compra → Descripción → Monto → Registrar; 7 campos, "Comisión" queda bajo el pie fijo (contenido 801 px en hoja de 729) | **3** | Monto primero; Tipo como control segmentado; Categoría, Fecha y Comisión tras "Más detalles" |
| **Ver próximos pagos** | Desplazar ~1 pantalla; solo 6 pagos, sin "ver todos"; fecha recortada | **0** | Segundo bloque del Inicio, filas de dos líneas, enlace "Ver los N pagos" |
| **Revisar flujo** | Desplazar 1.3 pantallas hasta una tarjeta de 686 px | **0–1** | Mini-gráfica en el héroe; tocarla lleva a la gráfica completa |

### 3.3 Hoja "Registrar" (`QuickActions.tsx:57-88`)

- El título dice "Registrar" y la primera opción es "¿Con qué tarjeta pago?", que no registra.
- Orden actual: recomendador, compra, **gasto**, ingreso, pago. Orden propuesto por frecuencia:
  **Gasto, Compra con tarjeta, Ingreso, Pago de tarjeta** y, separado por un divisor,
  "¿Con qué tarjeta pago?".
- "Ingreso" solo confirma depósitos programados. En `IncomePage.tsx` no encontré captura de un
  ingreso suelto (solo "Nueva fuente" y "Confirmar"); un ingreso no programado obliga a crear una
  fuente o a usar "Ajuste manual". Falta "Ingreso único".
- Los enlaces "Ir a Ingresos" / "Ir a Cuentas" repiten a mano las clases del botón
  (`QuickActions.tsx:272-278,334-341`) en vez de usar `ButtonLink`.

### 3.4 Formularios en hoja

- **El foco cae donde no hace falta.** Al abrir "Registrar gasto" el foco queda en el `select`
  Cuenta, que ya trae la predeterminada; en compra, en Tarjeta. El monto es el 4.º campo
  (`ExpenseFormDialog.tsx:87-123`, `PurchaseFormDialog.tsx:147-180`) y con el teclado abierto
  queda en el borde.
- **"Nueva tarjeta" son 14 campos en una hoja** (contenido de 1353 px en 729 visibles). Dividir en
  dos pasos: *Identidad y límite* (alias, institución, últimos 4, límite) y *Corte y pago* (lo
  demás, con los valores por defecto ya puestos).
- **El contenido se asoma por debajo del pie fijo.** En hojas largas se ve un campo entre el botón
  "Cancelar" y el borde inferior. Causa: `-mb-5` del pie contra el `pb-5` de la hoja
  (`dialog.tsx:21,65`).
- **Los campos de fecha de la gráfica miden 26 px con fuente de 12 px (medido).**
  `controlClass({ className: 'w-auto px-2 py-1 text-xs' })` (`CashflowChart.tsx:263,274`) anula el
  `text-base` de `control.ts`; por debajo de 16 px iOS hace zoom al enfocar.
- **Botones del pie de 40 px.** En la zona del pulgar deberían ser de 48.

### 3.5 Listas

- El "⋯" mide 36 × 36 (`icon-sm`) y está pegado a una fila que es toda botón: toque equivocado
  fácil. Subir a 44 y separar con un divisor.
- El menú es un desplegable `absolute` (`action-menu.tsx:67-70`); en las últimas filas puede
  quedar bajo la barra inferior. En móvil debe abrir como hoja de acciones.
- Recurrentes: cada ocurrencia lleva monto + "Confirmar" + "Omitir" en una línea
  (`RecurringPage.tsx:174-206`). "Omitir" es secundaria: va al "⋯".
- El botón "Filtros" mide 20 px de alto (`filters-card.tsx:22-26`). Pasa WCAG 2.5.8 por
  espaciado, pero toda la cabecera de la tarjeta debería ser el botón.

---

## 4. Dashboard

### 4.1 Sobre el pliegue (propuesto, 375 × 812)

```
┌─────────────────────────────────────┐
│ Inicio                  10 nov 2026 │  cabecera con título (sin saludo)
├─────────────────────────────────────┤
│ Disponible                          │
│ $23,149.50                          │  única cifra grande de la pantalla
│ Mínimo $6,749.50 · 4 dic            │
│ ● $6,749.50 sobre tu colchón        │  estado: color + icono + texto
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▂▂▂  ┈ colchón  │  mini-gráfica 30 días → abre Flujo
├─────────────────────────────────────┤
│ Por pagar · 7 días          $16,400 │
│ Oro ····4321                $16,400 │
│ Corte · vence 4 dic · en 24 días    │
│ Internet                       $599 │
│ Recurrente · 12 nov · en 2 días     │
│ Ver los 9 pagos de 30 días →        │
├─────────────────────────────────────┤
│ Tarjetas                            │
│ Oro ····4321     41 % ▓▓▓▓░░░░░░    │
│ Paga $16,400 antes del 4 dic        │
└─────────────────────────────────────┘
        [Inicio] [Mov.] (＋) [Tarj.] [Más]
```

Debajo del pliegue: gráfica completa → gasto del mes → próximos ingresos. El recomendador sale
del Inicio (vive en el "＋") o queda como una fila de enlace de 44 px al final.

### 4.2 KPIs y de dónde salen (sin API nueva)

| KPI | Fuente | Nota |
|---|---|---|
| **Disponible** | `summary.cash.spendableBalance` | héroe |
| **Margen sobre el colchón** | `projection.minimum.balance − projection.minCashBuffer` | reemplaza la tarjeta "Flujo mínimo"; negativo = "Te faltan $X el 4 dic" en rojo |
| **Por pagar (7 días)** | `summary.upcomingPayments.items` filtrado por fecha | el total de 30 días pasa a la vista completa |
| **Uso de crédito** | `totalDebt / (totalDebt + totalAvailableCredit)` | una cifra global junto al título "Tarjetas" |
| **Gasto del mes vs anterior** | `summary.expenses.spent`, `previousSpent` | ya existe (`DeltaBadge`) |

Cómo lo resuelven las apps de referencia: YNAB abre con una sola cifra ("Ready to Assign");
Rocket Money pone los cobros próximos arriba; Copilot y Monarch muestran gastos en color neutro y
reservan el verde para ingresos. Cuentas ya tiene los datos para los tres patrones.

### 4.3 Casos límite vistos en pantalla

- **Usuario nuevo:** ocho tarjetas en "$0.00" y "Dentro del colchón" con colchón de $0.00. Falta
  un primer uso: una lista de tres pasos (crear cuenta → registrar tarjeta → definir colchón) que
  reemplace al tablero mientras no haya cuentas.
- **Colchón en $0:** el badge "Dentro del colchón" no significa nada y la línea "Colchón" se
  encima con la del cero. Con colchón 0, ocultar ambos y ofrecer "Define tu colchón".
- **Fechas en dos formatos en la misma fila:** "Pago Oro (corte 2026-11-15 por cerrar)" junto a
  "4 dic 2026". La descripción llega así del backend; formatearla en el front o enviar la fecha
  como campo aparte.

### 4.4 Gráfica de flujo

| Hoy | Cambio | Por qué |
|---|---|---|
| El tramo bajo el colchón cambia de azul a rojo (`CashflowChart.tsx:408`); entre ambos hay 1.16:1 (claro) y 1.05:1 (oscuro) | Segundo canal: trama diagonal en la cuña (`<pattern>`) y trazo de 3 px | WCAG 1.4.1: con deuteranopía los dos tramos son indistinguibles |
| El mínimo es un punto rojo con `<title>` (`:460-470`) | Etiqueta directa: "Mín. $6,749 · 4 dic" | `<title>` no existe al tocar |
| La leyenda dice "línea punteada ámbar" y "tramos rojos" (`:547-550`) | Nombrar por forma: "línea punteada", "tramos con trama" | No depender del nombre del color |
| Texto del SVG a 10 px (`:418,430,442,536`) | 11 px | mínimo de la escala (`text-2xs`) |
| El eje baja a −$10 mil sin saldos negativos (visto) | El dominio empieza en 0 si el mínimo ≥ 0 | un tercio del área se va en vacío |
| 4 botones de ventana + 2 fechas siempre visibles | Control segmentado; "Personalizar" despliega las fechas con `controlClass()` sin anular tamaño | 26 px y zoom en iOS (3.4) |
| "Saldo inicial / Mínimo / Saldo final" repiten el héroe | En móvil dejar solo "Saldo final" y su variación | menos duplicado; la tarjeta baja de 686 px |
| Rejilla `chart-grid` al 45 % (1.18:1) | `#c4c0b3` al 70 % | hoy no se percibe |

Lo que ya está bien: curva en escalones (correcta para saldos), franja de entradas/salidas, panel
de detalle por día, flechas de teclado, resumen en vivo para lector de pantalla, "Ver como tabla"
y `prefers-reduced-motion`.

---

## 5. Sistema de diseño

La base existe. Esta sección fija lo que hoy es convención implícita y nombra lo que falta.

### 5.1 Tipografía (Manrope, cifras tabulares en montos)

| Nombre | Tamaño / interlínea | Peso | Uso | Hoy |
|---|---|---|---|---|
| `display` | 32 / 36 | 600 | única cifra héroe por pantalla | `text-3xl` ×2 en Inicio |
| `title` | 20 / 28 (24 / 32 desde `sm`) | 600 | título de pantalla | igual |
| `heading` | **16 / 24** | 600 | título de tarjeta o sección | `text-sm` (14) |
| `body` | 16 / 24 en móvil, 14 / 20 desde `sm` | 400–500 | título de fila, texto de campo | 14 fijo en filas |
| `label` | 14 / 20 | 500 | etiquetas, botones | igual |
| `caption` | 12 / 16 | 400 | metadatos (fecha, cuenta) | igual, pero usado de más |
| `micro` | 11 / 16 | 500 | barra inferior y sobretítulos en mayúsculas, nada más | `text-2xs` también en datos de la gráfica |

Regla: en una fila, **una** línea en `body` y **una** en `caption`. Ningún dato accionable
(fecha de pago, monto) en `micro`.

```css
/* src/index.css, dentro de @theme */
--text-display: 2rem;
--text-display--line-height: 2.25rem;
--text-display--letter-spacing: -0.02em;
```

### 5.2 Espaciado (base 4 px, utilidades de Tailwind)

| Uso | Valor |
|---|---|
| Margen lateral de página | 16 |
| Relleno de tarjeta | 16 (20 desde `sm`) — ya es así |
| Entre secciones | **24** (hoy 16) |
| Dentro de una sección | 12 |
| Entre campos de formulario | 16 — ya es así |
| Alto mínimo de fila | 56 |
| Objetivo táctil mínimo | **44** (hoy 36 en `sm` e `icon-sm`) |

### 5.3 Radios, sombras, bordes

| Elemento | Radio | Sombra |
|---|---|---|
| Campo, botón, fila de menú | 8 (`rounded-lg`) | ninguna (**quitar `shadow-card` de `control.ts`**) |
| Tarjeta, lista agrupada, aviso | 12 (`rounded-xl`) | `shadow-card` |
| Hoja y diálogo | 16 (`rounded-2xl`) | `shadow-sheet` / `shadow-menu` |
| Badge, pista de progreso, "＋" | completo | — |

Regla nueva: **una sola caja por nivel.** Nada con borde dentro de una `Card`; dentro se separa
con `divide-y divide-line`.

### 5.4 Botones

| Variante | Uso | Cambio |
|---|---|---|
| `primary` | una por pantalla u hoja | — |
| `secondary` | alternativa | — |
| `ghost` | acciones de barra | — |
| `danger` | confirmación destructiva | — |
| deshabilitado | — | `disabled:bg-surface-strong disabled:text-ink-muted disabled:border-transparent` en vez de `disabled:opacity-55` |

Tamaños: `sm` (36 en móvil) aparece 44 veces y se volvió el tamaño por defecto, incluso para la
acción principal de pantalla. Regla: `sm` solo dentro de filas densas; acción de página `md` (40);
pie de hoja `lg` subido a 48 en móvil (`h-12 sm:h-10`); `icon-sm` a 44 en móvil.

### 5.5 Campos

- Alto 44 en móvil (`h-11`, hoy 42 por relleno), fuente 16, sin sombra.
- `hint` conectado con `aria-describedby` (6.2).
- **Control segmentado** (componente nuevo, ver 8.4) para 2–4 opciones excluyentes: Tipo de compra,
  ventanas de la gráfica, tema. Hoy hay dos implementaciones a mano
  (`CashflowChart.tsx:236-252`, `AppShell.tsx:275-293`).
- `MoneyInput` con variante `size="lg"` (`text-2xl`, centrado) para el monto de las hojas de captura.

### 5.6 Badges de estado

Los cinco tonos actuales son correctos. Reglas de uso:

1. Máximo **un** badge por fila.
2. El badge es **estado**, no tipo ni categoría (el tipo va en la línea `caption`).
3. El estado por defecto no lleva badge.
4. Tono con significado: `danger` vencido o bloqueado, `warning` por vencer, `success` pagado o
   confirmado, `info` contador, `neutral` inactivo.

### 5.7 Tarjetas y piezas que faltan

| Pieza | Sustituye a |
|---|---|
| `ListGroup` + `ListItem` (una tarjeta, divisores) | `ListRow` como tarjeta suelta y las listas a mano del Inicio |
| `StatTile` (etiqueta, cifra, nota) | tres variantes a mano: `DashboardPage.tsx:84-95`, `:329-345`, `CashflowChart.tsx:281-310` |
| `Meter` (pista + valor + `role="meter"`) | barra de utilización a mano (`DashboardPage.tsx:259-264`) |
| `SegmentedControl` | ver 5.5 |
| Botón de cerrar en `DialogContent` | agarradera decorativa |

---

## 6. Accesibilidad (WCAG 2.2 AA)

### 6.1 Incumplimientos y riesgos

| # | Criterio | Hallazgo | Dónde | Arreglo |
|---|---|---|---|---|
| A1 | 1.4.1 Uso del color | El tramo bajo el colchón se distingue solo por tono (1.16 / 1.05:1) | `CashflowChart.tsx:408` | trama + grosor (4.4) |
| A2 | 4.1.2 / 2.1.1 | `role="menu"` sin flechas, Inicio/Fin ni foco itinerante; el menú de usuario no mueve el foco al abrir ni lo devuelve al cerrar | `action-menu.tsx:67-91`, `AppShell.tsx:102-139` | implementar el patrón de menú o quitar `role="menu"` y dejar una lista de botones |
| A3 | 2.4.1 Evitar bloques | No hay enlace "Saltar al contenido"; con teclado hay ~20 enlaces antes de `main` en escritorio | `AppShell.tsx:76-199` | enlace `sr-only focus:not-sr-only` a `<main id="contenido">` |
| A4 | 1.3.1 / 3.3.2 | El texto de ayuda de los campos no está asociado: `aria-describedby` solo apunta al error | `Field.tsx:26,30`, `MoneyInput.tsx:93,100`, `SelectField.tsx:32` | incluir el id de la ayuda |
| A5 | 2.1.2 / uso táctil con lector | Hojas sin control de cierre: "Registrar" y "Más secciones" solo se cierran con Escape o tocando el velo; la agarradera sugiere un gesto que no existe | `dialog.tsx:28-31` | botón "Cerrar" de 44 px arriba a la derecha en `DialogContent` |
| A6 | 1.4.4 / 1.4.10 | Datos accionables a 10–11 px (ejes y "Colchón" en el SVG; etiquetas "Desde/Hasta") | `CashflowChart.tsx:255,283,418` | mínimo 12; 11 solo en barra inferior |
| A7 | 2.5.8 Tamaño del objetivo | Cumplen 24 px, pero por debajo de 44: "⋯" 36, botones `sm` 36, campos de fecha 26, enlace "volver" 32, cerrar aviso 24 | `button-variants.ts:17,22`, `page-header.tsx:19`, `toast.tsx:51` | 44 en móvil |
| A8 | 2.2.1 Tiempo ajustable | Los avisos se cierran solos a los 3.5 s (6 s los de error) | `lib/toast.ts:53` | pausar al enfocar o tocar; el error no debería cerrarse solo |
| A9 | 3.3.1 | Cada error de campo es `role="alert"`: al enviar con tres errores se anuncian los tres a la vez; `MoneyInput` no recibe la `ref` de react-hook-form, así que el foco no salta al monto inválido | `Field.tsx:32`, `MoneyInput.tsx:102` | resumen de errores con foco, o pasar `ref` |
| A10 | 1.3.1 | La barra de utilización no expone valor (el texto sí lo dice, por eso es menor) | `DashboardPage.tsx:259-264` | `role="meter"` con `aria-valuenow` |
| A11 | 2.4.7 | El foco de los campos es un anillo al 25 % de opacidad más cambio de color de borde | `control.ts:13` | anillo sólido de 2 px (`ring-focus`) |

### 6.2 Lo que ya cumple (no tocar)

`lang="es-MX"`; contraste AA con prueba automática; foco visible global; `prefers-reduced-motion`;
etiquetas visibles en todos los campos; `aria-invalid` + error asociado; `aria-current` en la
navegación; iconos decorativos con `aria-hidden`; gráfica con resumen en vivo, teclado y tabla
alternativa; variaciones con flecha + signo + texto (no solo color); diálogos Radix con trampa de
foco; avisos con `role="status"` / `alert`; 16 px en campos (salvo los de la gráfica).

### 6.3 Privacidad (fuera del alcance, visto de paso)

Tras el registro la app navega a `/verificar-correo?email=…`: el correo queda en la URL, el
historial y cualquier captura de pantalla. Pasarlo por `state` del router.

---

## 7. Simplificación

| Pantalla | Hoy | Propuesta |
|---|---|---|
| **Inicio** | 8 tarjetas, 2.7 pantallas | 3 bloques sobre el pliegue + 3 debajo (sección 4) |
| **Hoja Registrar** | 5 opciones, la 1.ª no registra | 4 capturas por frecuencia + enlace al recomendador |
| **Registrar gasto** | 6 campos visibles | Monto, Descripción, Cuenta (si hay más de una); Categoría, Fecha y Notas tras "Más detalles" |
| **Registrar compra** | 7–11 campos | Monto, Descripción, Tarjeta, Tipo (segmentado); Meses y Tasa solo si aplica; el resto tras "Más detalles" |
| **Nueva tarjeta** | 14 campos, 1353 px | 2 pasos (4 + 10 con valores por defecto) |
| **Movimientos** | Primario "Ajuste manual", filtros en tarjeta, 5 pestañas | "Ajuste manual" al "⋯" de la cabecera; filtros como fila de chips; 4 pestañas |
| **Recurrentes** | "Confirmar" + "Omitir" por fila; 2 badges; CTA duplicado en vacío | "Confirmar" en fila, "Omitir" en "⋯"; frecuencia a la línea secundaria; un solo CTA |
| **Estados vacíos** | El botón de la cabecera y el del estado vacío dicen lo mismo | Ocultar el de la cabecera mientras la lista esté vacía |
| **Movimiento "Saldo inicial"** | Badge "Saldo inicial" + título "Saldo inicial" (fila de 96 px) | Sin badge de tipo en el título (regla 5.6) |

---

## 8. Entregables

### 8.1 Top 20 problemas de UX (por impacto)

| # | Problema | Cambio | Impacto esperado | Archivo |
|---|---|---|---|---|
| UX-1 | La **fecha de pago se recorta** en "Próximos pagos": vive dentro del `truncate` con badge y descripción (necesita 366 px, tiene 220) | Fila de dos líneas: descripción arriba; "Tipo · fecha · en N días" abajo, fuera del `truncate` | El dato más importante del Inicio vuelve a ser legible | `DashboardPage.tsx:195-203` |
| UX-2 | **Pestaña activa fuera de pantalla** en `/cuentas` (x = 397–477) y "Recurrentes" cortada | `scrollIntoView` de la activa + desvanecido en el borde + sacar "Cuentas" del módulo | El usuario sabe dónde está | `section-tabs.tsx:25-43`, `nav.ts:75` |
| UX-3 | Próximos pagos **bajo el pliegue** y limitados a 6 sin "ver todos" | Segundo bloque del Inicio, 7 días, enlace a la lista completa | Responde "¿qué pago?" sin desplazar | `DashboardPage.tsx:180-209` |
| UX-4 | **Hojas sin botón de cerrar**; agarradera sin gesto | Botón "Cerrar" en `DialogContent` | Salida evidente; desbloquea lectores de pantalla táctiles | `dialog.tsx:28-31` |
| UX-5 | **Monto en 4.º lugar**, foco en un `select` ya resuelto | Monto primero y enfocado (`onOpenAutoFocus`) | −2 toques por captura; el teclado numérico abre solo | `ExpenseFormDialog.tsx:87-123`, `PurchaseFormDialog.tsx:147-180` |
| UX-6 | Hoja "Registrar" abre con el recomendador; "Gasto" es 3.º | Reordenar por frecuencia | La acción más común queda bajo el pulgar | `QuickActions.tsx:57-88` |
| UX-7 | **Dos héroes** y cifras duplicadas en Inicio | Un héroe "Disponible" con margen sobre el colchón | Lectura en 2 s | `DashboardPage.tsx:83-142` |
| UX-8 | Campos de fecha de la gráfica: **26 px, 12 px de fuente** | `controlClass()` sin anular tamaño, tras "Personalizar" | Sin zoom en iOS, tocables | `CashflowChart.tsx:254-277` |
| UX-9 | Compra con tarjeta: 7–11 campos, "Comisión" bajo el pie | Divulgación progresiva + Tipo segmentado | Formulario sin desplazar en el caso común | `PurchaseFormDialog.tsx:146-251` |
| UX-10 | Sin **primer uso**: tablero de ceros | Lista de 3 pasos mientras no haya cuentas | El usuario nuevo sabe por dónde empezar | `DashboardPage.tsx:80` |
| UX-11 | 40 % de pantalla de cromo antes del primer movimiento | Título en la cabecera; filtros como chips | +2 filas visibles | `AppShell.tsx:77-144`, `page-header.tsx`, `filters-card.tsx` |
| UX-12 | "Ajuste manual" como acción principal de Movimientos | Moverla a un "⋯" | La pantalla deja de invitar a la acción rara | `MovementsPage.tsx:98-104` |
| UX-13 | "Nueva tarjeta": 14 campos en una hoja | Dos pasos | Menos abandono al dar de alta | `CardFormDialog.tsx` |
| UX-14 | Sin **ingreso único** | Opción "Ingreso único" en la hoja de ingreso | Cubre el depósito no programado | `QuickActions.tsx:197-283`, `IncomePage.tsx` |
| UX-15 | Recomendador duplicado (Inicio + "＋") ocupando el 3.er lugar | Quitarlo del Inicio o dejarlo como fila al final | 120 px para pagos | `DashboardPage.tsx:144-178` |
| UX-16 | "⋯" de 36 px pegado a una fila tocable; menú desplegable que puede quedar bajo la barra | 44 px, divisor y hoja de acciones en móvil | Menos toques equivocados | `list-row.tsx:58-62`, `action-menu.tsx:48-70` |
| UX-17 | Gráfica 1.3 pantallas abajo y de 686 px | Mini-gráfica en el héroe + tarjeta compacta | El flujo se ve sin desplazar | `DashboardPage.tsx:288-298`, `CashflowChart.tsx` |
| UX-18 | Contenido visible bajo el pie fijo de las hojas largas | Quitar el hueco (`pb-0` en la hoja cuando hay pie) | Se ve terminado | `dialog.tsx:21,65` |
| UX-19 | "Confirmar" y "Omitir" con el mismo peso en cada ocurrencia | "Omitir" al "⋯" | Una decisión por fila | `RecurringPage.tsx:174-206` |
| UX-20 | Avisos que se cierran en 3.5 s; cabecera móvil con cambio de tema | Pausa al tocar; tema solo en "Más" | Menos mensajes perdidos; cabecera útil | `lib/toast.ts`, `AppShell.tsx:87` |

### 8.2 Top 20 mejoras de UI (por impacto)

| # | Mejora | Por qué | Archivo |
|---|---|---|---|
| UI-1 | `--color-expense` = tinta; rojo solo para problemas | El rojo recupera su significado | `index.css:114,178` |
| UI-2 | El color del "mínimo" lo decide el colchón, no el signo | Elimina la señal contradictoria verde + "por debajo" | `DashboardPage.tsx:120`, `CashflowChart.tsx:291` |
| UI-3 | Saldos de cuenta sin color | Un saldo no es bueno ni malo | `AccountsPage.tsx:129` |
| UI-4 | Segundo canal en el tramo bajo el colchón (trama + grosor) | 1.05:1 entre tramos en oscuro | `CashflowChart.tsx:358-360,408` |
| UI-5 | Listas agrupadas: una tarjeta con divisores | Menos cajas, más filas | `list-row.tsx:32-36` |
| UI-6 | `CardTitle` a 16 px | El título pesa más que el cuerpo | `card.tsx:15` |
| UI-7 | Una sola cifra `display` por pantalla | Punto focal | `DashboardPage.tsx:87,119,336` |
| UI-8 | 24 px entre secciones, 12 dentro | Agrupa por proximidad | `DashboardPage.tsx:81` |
| UI-9 | Sin cajas con borde dentro de `Card` | Un nivel de contenedor | `DashboardPage.tsx:250` |
| UI-10 | Estado deshabilitado con tokens, no opacidad | 2.76 → 4.10:1 | `button-variants.ts:5` |
| UI-11 | Campos sin `shadow-card`, 44 px, foco sólido | Un campo es un hueco | `control.ts:10-13` |
| UI-12 | Badge neutro para tipo; verde solo para estado | Quita doble codificación | `MovementsPage.tsx:181` |
| UI-13 | Sin badge para el estado por defecto ("Activa") | Solo se marca la excepción | `RecurringPage.tsx:254`, listas de cuentas y tarjetas |
| UI-14 | Estrella del recomendador en `brand-ink` | Ámbar = aviso | `DashboardPage.tsx:156` |
| UI-15 | Texto de gráfica a 11–12 px y rejilla visible | Legibilidad | `CashflowChart.tsx:348,418,536` |
| UI-16 | Eje Y desde 0 cuando no hay negativos | La curva usa toda el área | `cashflow-chart-model.ts` (`buildYScale`) |
| UI-17 | Botones de pie de hoja de 48 px; `sm` solo en filas | Zona del pulgar | `button-variants.ts:17-22`, `dialog.tsx:59-74` |
| UI-18 | Pantalla de carga con el `canvas` del tema | Sin parpadeo oscuro en tema claro | `LoadingScreen.tsx` |
| UI-19 | Modo oscuro cálido | Coherente con acceso y con el claro | `index.css:133-183` |
| UI-20 | `line` a `#dedbd1` | La tarjeta se separa del fondo (1.27 → 1.39) | `index.css:68` |

Al aplicar UI-1: `DeltaBadge` (`DashboardPage.tsx:376`) y el saldo negativo de la tabla
(`CashflowChart.tsx:608`) usan `text-expense` para decir "esto va mal"; deben pasar a
`text-danger`.

### 8.3 Antes / después

**A. Fila de "Próximos pagos"** (`DashboardPage.tsx:191-205`)

```tsx
// Antes: badge, descripcion y fecha comparten un truncate; la fecha se corta
<span className="min-w-0 truncate text-ink-secondary">
  <Badge tone="neutral" className="mr-2">{PAYMENT_TYPES[payment.type]}</Badge>
  {payment.description}
  <span className="ml-2 text-xs text-ink-muted">{formatLocalDate(payment.date)}</span>
</span>
<MoneyDisplay cents={payment.amount} className="font-medium text-expense" />
```

```tsx
// Despues: dos lineas; la fecha nunca se recorta; monto en tinta
<span className="min-w-0 flex-1">
  <span className="block truncate text-base font-medium text-ink sm:text-sm">
    {payment.description}
  </span>
  <span className="block text-xs text-ink-muted">
    {PAYMENT_TYPES[payment.type]} · {formatLocalDate(payment.date)} · {relativeDays(payment.date, today)}
  </span>
</span>
<MoneyDisplay cents={payment.amount} className="font-semibold text-ink" />
```

```
Antes:  [Corte] Pago Oro (corte 2026-11…      $16,400.00   ← rojo, fecha cortada
Después: Pago Oro                              $16,400.00
         Corte · 4 dic · en 24 días
```

**B. Héroe del Inicio**

```
Antes                                Después
┌────────────────────────────┐       ┌────────────────────────────┐
│ Efectivo disponible        │       │ Disponible                 │
│ Cuentas que cuentan para…  │       │ $23,149.50                 │
│ $23,149.50                 │       │ Mínimo $6,749.50 · 4 dic   │
│ Total en 1 cuenta: $23,149 │       │ ● $6,749.50 sobre colchón  │
└────────────────────────────┘       │ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▂▂ ┈ colchón │
┌────────────────────────────┐       └────────────────────────────┘
│ Flujo mínimo proyectado    │        176 px en vez de 316
│ Del 10 nov al 10 dic       │
│ $6,749.50  (verde)         │
│ el 4 dic · colchón $0.00   │
│ [Dentro del colchón]       │
└────────────────────────────┘
```

**C. Hoja "Registrar"**

```
Antes                          Después
¿Con qué tarjeta pago?         Gasto
Compra con tarjeta             Compra con tarjeta
Gasto                          Ingreso
Ingreso                        Pago de tarjeta
Pago de tarjeta                ─────────────────────
                               ¿Con qué tarjeta pago? →
```

**D. Registrar gasto**

```
Antes (foco en Cuenta)         Después (foco en Monto)
Cuenta            [select]              $ 0.00           ← grande, teclado numérico
Categoría         [select]     Descripción  [        ]
Descripción       [      ]     Cuenta       [Débito ▾]   ← solo si hay más de una
Monto             [$     ]     Más detalles ▸  (categoría, fecha, notas)
Fecha             [      ]
Notas             [      ]     [      Registrar gasto      ]  48 px
```

**E. Tokens** (`src/index.css`)

```css
/* Antes */                       /* Despues */
--color-line: #e6e4dd;            --color-line: #dedbd1;
--color-expense: #b3261e;         --color-expense: #211f1c;   /* .dark: #eceae4 */
--color-chart-grid: #d8d5cb;      --color-chart-grid: #c4c0b3;
```

```ts
// button-variants.ts — antes
'disabled:pointer-events-none disabled:opacity-55'
// despues
'disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-strong disabled:text-ink-muted'
```

**F. Fechas de la gráfica** (`CashflowChart.tsx:263`)

```tsx
// Antes: 26 px de alto, 12 px de fuente
className={controlClass({ className: 'w-auto px-2 py-1 text-xs' })}
// Despues: hereda 16 px y el alto estandar
className={controlClass({ className: 'w-auto' })}
```

### 8.4 Recomendaciones de implementación (React + Tailwind 4)

Respetan las reglas del repo: colores solo en `src/index.css`, sin clases `dark:`, sin HEX en
`src/**`, pares nuevos en `design-tokens-contrast.test.ts`, mensajes y comentarios sin acentos.

**Orden sugerido (cada bloque es una fase con sus pruebas):**

| Fase | Contenido | Riesgo | Pruebas que se mueven |
|---|---|---|---|
| A. Correcciones — **hecha**, ver [fase 33](fase-33-correcciones-ux.md) | UX-1, UX-2, UX-4, UX-8, UX-18, A3, A4 | bajo | `dashboard.test.tsx`, `ui-primitives.test.tsx`, `e2e/mobile.spec.ts` (etiqueta "Secciones de …") |
| B. Color — **hecha**, ver [fase 34](fase-34-color-con-significado.md) | UI-1, UI-2, UI-3, UI-10, UI-12, UI-13, UI-14, UI-20 | bajo | `design-tokens-contrast.test.ts` (pares de `expense`) |
| C. Captura — **hecha en parte**, ver [fase 35](fase-35-captura-rapida.md) (UX-14 requiere backend) | UX-5, UX-6, UX-9, UX-13, UX-14 + `SegmentedControl` | medio | pruebas de formularios, `e2e/mobile.spec.ts` (orden de campos) |
| D. Inicio — **hecha**, ver [fase 36](fase-36-inicio-reordenado.md) | UX-3, UX-7, UX-10, UX-15, UX-17 + `StatTile`, `Meter` | medio | `dashboard.test.tsx`, E2E del tablero |
| E. Listas y cromo — **hecha en parte**, ver [fase 37](fase-37-listas-y-cabecera.md) (sin chips de filtros) | UI-5, UX-11, UX-12, UX-16, UX-19 + `ListGroup` | medio | todas las suites de listas (`data-testid` de `ul`) |
| F. Oscuro cálido — **hecha**, ver [fase 38](fase-38-oscuro-calido.md) | UI-19, UI-18 | bajo | contraste; `index.html` (`theme-color`) |

**Piezas concretas:**

```tsx
// components/ui/segmented-control.tsx — sustituye las dos implementaciones a mano
interface Option<T extends string> { value: T; label: string }

export function SegmentedControl<T extends string>({
  label, options, value, onChange,
}: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface-subtle p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-11 rounded-md px-3 text-sm font-medium transition sm:min-h-9',
            option.value === value ? 'bg-surface text-ink shadow-card' : 'text-ink-secondary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

```tsx
// dialog.tsx — boton de cerrar real (UX-4)
<DialogPrimitive.Close
  aria-label="Cerrar"
  className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-subtle"
>
  <X className="size-5" aria-hidden="true" />
</DialogPrimitive.Close>
```

```tsx
// section-tabs.tsx — la pestana activa siempre visible (UX-2)
const activeRef = useRef<HTMLAnchorElement>(null)
const { pathname } = useLocation()
useEffect(() => {
  activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
}, [pathname])
```

```tsx
// AppShell.tsx — saltar al contenido (A3)
<a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-menu">
  Saltar al contenido
</a>
// ...
<main id="contenido" tabIndex={-1} className="min-w-0 flex-1 pb-28 md:pb-8">
```

```tsx
// Field.tsx — la ayuda tambien se anuncia (A4)
const hintId = hint && !error ? `${inputId}-hint` : undefined
<input aria-describedby={errorId ?? hintId} ... />
{hint && !error && <p id={hintId} className="mt-1 text-xs text-ink-muted">{hint}</p>}
```

```tsx
// Formularios de captura — foco en el monto (UX-5)
<DialogContent onOpenAutoFocus={(event) => {
  event.preventDefault()
  document.getElementById('expenseAmount')?.focus()
}}>
```

**Qué no hacer:**

- No agregar una librería de gráficas: el SVG propio ya resuelve teclado, tabla y movimiento.
- No agregar una librería de componentes: faltan cinco piezas pequeñas, no un sistema.
- No cambiar la estructura de la barra inferior ni la marca.
- No usar `MoneyDisplay colored` en saldos: reservarlo para flujos.
