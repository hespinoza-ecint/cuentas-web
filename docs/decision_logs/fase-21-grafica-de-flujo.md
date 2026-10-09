# Decisiones — Fase 21 (gráfica de flujo interactiva)

Fecha: octubre 2026. Solo `cuentas-web`. Formato: contexto → opciones abiertas →
evidencia → elección → sacrificio aceptado → cómo se probó.

---

## D1. Rediseño de la gráfica de flujo: qué se conserva y qué se tira

**Contexto:** la gráfica "Flujo de efectivo proyectado" (fases 3/18) tenía
errores que la hacían mentir: la línea era diagonal entre días con movimiento
(parecía un descenso gradual), terminaba antes del fin de la ventana, la
tarjeta se desmontaba al cambiar el rango y el único detalle por día era un
`<title>` (inaccesible en móvil/teclado). Además la API ya mandaba colchón,
flujo por día y eventos que no se usaban.

**Opciones consideradas:**

1. *Urge:* parche mínimo — arreglar la diagonal y no tocar nada más.
   Sacrificio: cero riesgo, pero deja el resto de la información sin usar.
2. *Contraria:* migrar a una librería de gráficas (Recharts y similares).
   Sacrificio: ~50 KB + dependencia y un look "default" ajeno al sistema
   "estado de cuenta"; ya existe SVG propio probado.
3. *Out-of-box:* sparkline minúscula "solo tendencia", sin ejes ni cifras.
   Sacrificio: pierde la lectura de montos y fechas, que aquí importa.
4. *Síntesis (elegida):* gráfica de **escalones** con colchón y zona de
   riesgo, franja de flujo diario, cifras arriba, atajos de ventana y panel de
   detalle accesible; SVG propio.

**Evidencia:** el backend entrega `inflows`/`outflows`/`events` por día y
`minCashBuffer` (ver `cuentas-api/src/modules/cashflow/cashflow.service.ts`);
el modelo del dinero es "el saldo es plano hasta que hay un movimiento" (el
libro es la fuente de verdad). Los montos como protagonistas son el lenguaje
de la fase 20 ("estado de cuenta").

**Decisión:** opción 4.

**Sacrificio aceptado:** más código propio (modelo + componente + panel) y una
coordenada Y que a veces no incluye el cero (cuando el saldo está lejos de él);
se compensa mostrando el cero cuando cambia de signo o está a menos de un
rango.

**Pruebas:** `cashflow-chart-model.test.ts` (24) + `dashboard.test.tsx`
(rango, teclado, atajos).

---

## D2. Detalle del día: panel fijo, no tooltip flotante

**Contexto:** el detalle por día era un `title` nativo: solo aparece con mouse,
nunca en el teléfono y no existe para teclado o lector de pantalla.

**Opciones:** (a) tooltip flotante al pasar/tocar; (b) panel fijo bajo la
gráfica que se actualiza al seleccionar; (c) solo tabla en un `<details>`.

**Evidencia:** el uso principal es el teléfono (fase 12/20); un tooltip bajo el
dedo queda tapado y es frágil con zoom; Radix/nuestro sistema no tiene tooltip
propio. El panel fijo, además, sirve de región accesible con `role="status"`.

**Decisión:** (b), con la selección por toque, arrastre del puntero y flechas
← → (el conjunto seleccionable son días con movimientos + extremos + hoy), y
(a)+(c) como complementos: `<title>` en los puntos para hover de escritorio y
la tabla completa en "Ver como tabla".

**Sacrificio aceptado:** la tarjeta es unos 60 px más alta con el panel
siempre visible; el detalle de días sin movimientos es un texto breve.

**Pruebas:** caso "recorre el detalle del día con el teclado" en
`dashboard.test.tsx`; revisión visual en móvil (selección por toque).

---

## D3. Montos del eje abreviados con formato propio (no `Intl` compacto)

**Contexto:** las etiquetas del eje Y necesitan ser cortas ("$9.8 mil"), pero
`Intl.NumberFormat(..., { notation: 'compact' })` varía según versión de ICU y
plataforma ("$980 k" en Node 24 vs otras variantes), lo que vuelve frágiles las
pruebas y el look.

**Decisión:** `compactCents` propio con sufijos en español ("mil", "M"),
redondeo a 1 decimal y escalado a M cuando el valor redondea a 1000 mil.

**Sacrificio aceptado:** ~20 líneas de formato propias en vez de `Intl`.

**Pruebas:** casos exactos en `cashflow-chart-model.test.ts`.

---

## D4. Datos previos al cambiar el rango (`keepPreviousData`)

**Contexto:** al cambiar `Desde`/`Hasta` cambiaba el `queryKey`, la proyección
quedaba vacía y **toda la tarjeta se desmontaba**, incluidos los campos de
fecha recién usados.

**Decisión:** `placeholderData: keepPreviousData` (TanStack Query) + `isStale`
para atenuar el contenido mientras llega la respuesta. La gráfica dibuja los
datos de `projection` (atrasados) mientras los campos muestran el rango nuevo.

**Sacrificio aceptado:** durante el fetch puede verse por un instante la
gráfica del rango anterior (al 60% de opacidad y con `aria-busy`); preferible
al parpadeo/desmontaje anterior.

**Pruebas:** el caso de rango en `dashboard.test.tsx` verifica que la gráfica
sigue montada inmediatamente después del cambio.
