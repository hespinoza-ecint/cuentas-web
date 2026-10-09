# Decisiones — Fase 20 (rediseño móvil integral)

Fecha: octubre 2026. Rama: `feat/rediseno-movil-fase20` (solo `cuentas-web`).

Cada decisión sigue el formato: contexto → opciones que se mantuvieron abiertas →
evidencia → elección y por qué → costo aceptado (sacrificio) → cómo se probó.

---

## D1. Estructura de navegación móvil

**Contexto:** la barra inferior tenía Inicio · Compras · Tarjetas · Recomendador ·
Más, y un botón "＋" flotante que tapaba el final de las listas. Movimientos, el
uso diario más probable, estaba enterrado en la hoja "Más" (14 opciones).

**Opciones consideradas:**

1. *Urge:* mantener las pestañas actuales y solo pulir estilos. Sacrificio: cero
   riesgo, pero deja el problema de fondo (tapa contenido, secciones diarias ocultas).
2. *Contraria:* cinco secciones planas sin módulos (Inicio, Movimientos, Tarjetas,
   Compras, Recomendador) + "Más". Sacrificio: Compras y Recomendador no son de uso
   tan frecuente; satura la barra (Fitts ya está justo en 360px).
3. *Síntesis (elegida):* módulos con pestañas internas — Inicio · Movimientos ·
   (＋) · Tarjetas · Más — donde el "＋" central absorbe Recomendador
   ("¿Con qué tarjeta pago?") y las capturas rápidas; Compras/Pagos viven dentro
   de Tarjetas y Gastos/Ingresos/Recurrentes/Cuentas dentro de Movimientos.
4. *Fuera de la caja:* eliminación del menú "Más" a favor de una pantalla de ajustes
   completa. Sacrificio: más pasos para temas/sesión; descartada.

**Evidencia:** el E2E móvil existente ya exigía que "Más" agrupara secciones y que
nada desbordara a 360px (`e2e/mobile.spec.ts`); la hoja "Más" con 5 grupos era el
punto de mayor densidad; el patrón "módulo con pestañas" es el de las apps de
banca (Jakob's Law).

**Decisión:** opción 3. El Recomendador queda a 2 toques desde cualquier pantalla
(pestaña del "＋" y tarjeta del Inicio), sin consumir una pestaña fija.

**Sacrificio aceptado:** una ruta deja de ser alcanzable con un solo toque
(Compras ahora es Tarjetas → Compras). Se compensa con el "＋" en todas las pantallas.

**Pruebas:** `e2e/mobile.spec.ts` (pestañas y módulos), `app-shell-mobile.test.tsx`.

---

## D2. Aviso de actualización de la PWA sin `virtual:pwa-register`

**Contexto:** `registerType: 'autoUpdate'` actualizaba el service worker en
silencio; en el teléfono hacía falta `Ctrl+F5`. La solución oficial es
`useRegisterSW()` de `vite-plugin-pwa/react`.

**Evidencia:** con el módulo virtual, Vitest falla al resolverlo
(`file:///@vite-plugin-pwa/virtual:pwa-register/react`) y tumbó las 20 suites que
montan `AppShell`. Se reprodujo dos veces.

**Opciones:** (a) hook virtual + mock en setup; (b) dejar autoUpdate y no avisar;
(c) registro manual del SW en producción con `navigator.serviceWorker`, mensaje
`SKIP_WAITING` y recarga al `controllerchange`.

**Decisión:** (c). El SW generado por `vite-plugin-pwa` ya escucha
`SKIP_WAITING` con `registerType: 'prompt'`, así que no hay que tocar Workbox;
se eliminó `injectRegister` automático y el registro vive en
`src/app/PwaUpdatePrompt.tsx` (montado en `Providers`, funciona también en login).

**Sacrificio aceptado:** ~50 líneas propias de plomería de SW en lugar de una API
de terceros; a cambio, las pruebas corren y el flujo es explícito.

---

## D3. Paleta y tipografía

**Contexto:** índigo sobre gris frío (canónico) y fuente del sistema.

**Evidencia:** los colores ya eran tokens (fase 19), por lo que cambiar tono es
baratísimo; la prueba `design-tokens-contrast.test.ts` (nueva) verifica 30 pares
WCAG AA en claro y oscuro (4.5:1 texto, 3:1 UI). Manrope se verificó con cifras
tabulares (`tnum`) para montos.

**Decisión (elegida por el usuario):** dirección "estado de cuenta" — papel cálido +
tinta, marca azul tinta `#1e46c8`, divisores finos, sombras casi nulas, montos
protagonistas. Manrope variable autoalojada (40 KB en `/public/fonts`, precacheada
por el SW; sin dependencia npm).

**Rechazadas:** refinar el índigo (poco distintivo); neobanco oscuro primero
(riesgo de legibilidad); fuentes de sistema (sin control de cifras).

---

## D4. Guardia de cambios sin guardar y avisos de éxito

**Contexto:** cerrar una hoja (velo, Escape o gesto) perdía lo capturado; 13
diálogos se cerraban sin ninguna confirmación visual.

**Evidencia:** el usuario es de una sola mano y el gesto de deslizar cierra las
hojas de Radix sin aviso; las mutaciones ya invalidan cachés, así que un aviso
breve no agrega riesgo.

**Decisión:** `FormDialog` (pregunta "Descartar cambios" solo si
`form.formState.isDirty`) y `Toaster` propio (máx. 3 avisos, 3.5 s, errores 6 s,
`role=status/alert`, sin dependencias). Las páginas conservan `SuccessAlert` como
ancla estática en formularios largos (Configuración/Perfil).

**Sacrificio aceptado:** no hay "deshacer" real (requiere API); las reversas de
dinero siguen siendo reversas con motivo, como manda el modelo.
