# Fase 20 — Rediseño móvil integral

## 1. Objetivo

Que la PWA se sienta como una app móvil nativa: navegación por módulos con el
pulgar, jerarquía clara (el dinero primero), un sistema de diseño único, estados
visibles (carga, error, vacío, sin conexión, sesión expirada, versión nueva) y
objetivos táctiles cómodos, sin perder ninguna función existente.

La auditoría previa encontró tres problemas mayores: filas con 3–4 botones
sueltos junto a acciones destructivas, el botón "＋" flotante tapando listas, y
ausencia casi total de confirmaciones de éxito y de protección de formularios.

## 2. Dirección visual ("estado de cuenta")

- Fondo de papel cálido (`#f6f5f1`) y texto tinta (`#211f1c`); marca azul tinta
  (`#1e46c8`) que no compite con verde = ingreso ni rojo = gasto.
- Divisores finos, sombras casi imperceptibles, montos como protagonistas
  (3xl, `tabular-nums`).
- Modo oscuro en azul medianoche con los mismos tokens.
- Tipografía Manrope variable autoalojada (`public/fonts`, 40 KB, precacheada
  por el service worker; se probó que tiene cifras tabulares).
- La guardia `src/lib/design-tokens-contrast.test.ts` calcula el contraste WCAG
  real de 30 pares en claro y oscuro (AA: 4.5:1 texto, 3:1 componentes).

## 3. Navegación

- **Barra inferior:** Inicio · Movimientos · (＋) · Tarjetas · Más. El "＋"
  central ya no flota sobre el contenido y absorbe las acciones rápidas:
  ¿Con qué tarjeta pago? (recomendador), Compra con tarjeta, Gasto, Ingreso y
  Pago de tarjeta (llega a `/pagos?nuevo=1`).
- **Pestañas de módulo** (`SectionTabs`, subrayado con color + texto):
  - Movimientos ⇢ Movimientos / Gastos / Ingresos / Recurrentes / Cuentas.
  - Tarjetas ⇢ Tarjetas / Compras / Pagos.
- **Hoja "Más":** Planeación (Historial, Reglas, Categorías), Tu cuenta, tema y
  cerrar sesión. Menú lateral de escritorio agrupado con los mismos módulos.
- El detalle de tarjeta estrena encabezado con "volver" y sus acciones
  secundarias (Conciliar, Reiniciar, Eliminar) viven en el menú "⋯".

## 4. Sistema de diseño

Tokens en `src/index.css` (`@theme`): color semántico (claro/oscuro), tipografía
(escala, `text-2xs` para la barra), sombras `card/menu/sheet`, y utilidades
`safe-t/safe-b`. Reglas globales: foco visible por teclado, sin tap-highlight,
`scroll-margin` para el teclado virtual, `prefers-reduced-motion` y animación
breve de entrada para los avisos.

Componentes compartidos nuevos o reforzados:

| Pieza | Qué resuelve |
|---|---|
| `control.ts` | Una sola receta de estilos para inputs/selects/textareas (incluye estados de error y foco) |
| `Button`/`ButtonLink`/`SubmitButton` | Botón con estado de carga; el de guardar se deshabilita sin conexión y evita envíos duplicados |
| `Checkbox`/`Switch` | Filas táctiles de 44 px; el interruptor comunica estado con color y posición |
| `ListRow` + `ActionMenu` | Fila tocable que abre el detalle; acciones secundarias en "⋯" (Escape cierra y devuelve el foco) |
| `SectionTabs` | Pestañas de módulo con `aria-current` |
| `FormDialog` | Pregunta "Descartar cambios" si el formulario está sucio |
| `Toaster` + `lib/toast.ts` | Avisos breves tras guardar (máx. 3, `role=status/alert`, autocierre) |
| `Banner` | Franjas de sin conexión, cuenta en eliminación y versión nueva |
| `PasswordField` | Mostrar/ocultar contraseña con botón de 44 px |
| `PageHeader` | Encabezado con "volver" y acciones que se apilan en móvil |

## 5. Pantallas

- **Inicio:** efectivo → flujo mínimo (con estado en palabras e icono) → tarjeta
  de acción "¿Con qué tarjeta pago?" → próximos pagos → tarjetas compactas (uso
  bajo/medio/alto con texto, no solo color) → gráfica → ingresos y gastos.
- **Listas** (Movimientos, Gastos, Compras, Pagos, Recurrentes, Cuentas,
  Categorías, Ingresos, Historial): fila = detalle; "⋯" = Editar/Cancelar/
  Revertir/Eliminar/etc.; Eliminar siempre pide confirmación con motivo.
- **Formularios:** etiquetas visibles, ayuda corta, error junto al campo, tipos
  de teclado correctos, el botón principal queda a la vista en el pie fijo de la
  hoja, aviso de éxito al guardar y guardia de descarte.
- **Textos:** fuera los códigos internos ("RN-xx"), "se materializan", "solo
  inserción", "amortización francesa" y "En la siguiente fase…".
- **Auth:** marco oscuro con la marca, mostrar/ocultar contraseña y aviso
  "Tu sesión expiró…" cuando el refresh falla (se recuerda a dónde ibas).

## 6. PWA

- Íconos PNG 192/512 + maskable + `apple-touch-icon` (generados con
  `scripts/gen-icons.mjs`), metadatos de iOS y `viewport` con
  `interactive-widget=resizes-content`.
- `registerType: 'prompt'`: aviso "Hay una versión nueva · Actualizar" con
  registro manual del service worker (ver decisión D2 en
  `docs/decision_logs/fase-20-rediseno-movil.md`); ya no hace falta `Ctrl+F5`.
- Sin conexión: franja de aviso, lecturas cache (NetworkFirst) y botones de
  guardar deshabilitados con explicación.

## 7. Accesibilidad

Contraste AA verificado por prueba; foco visible con anillo; áreas táctiles de
40–44 px; `aria-label` en iconos y menús; estados nunca solo por color (uso de
crédito con texto, badges de estado); `prefers-reduced-motion`; teclado completo
en menús y diálogos.

## 8. Archivos principales

- `src/index.css` — tokens, tipografía, base y utilidades.
- `src/app/AppShell.tsx`, `nav.ts`, `QuickActions.tsx`, `PwaUpdatePrompt.tsx` —
  navegación, "＋" central, aviso de versión.
- `src/components/ui/*` — primitivas nuevas (texto arriba).
- `src/components/shared/*` — campos y diálogos con receta única.
- `src/features/**` — todas las páginas y diálogos migrados a `ListRow`,
  `FormDialog`, `SubmitButton` y avisos.
- `public/*`, `index.html`, `vite.config.ts`, `scripts/gen-icons.mjs` — PWA.
- `docs/decision_logs/fase-20-rediseno-movil.md` — decisiones y descartes.

## 9. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run lint        # limpio
npm.cmd run test        # 29 archivos / 93 pruebas
npm.cmd run build       # OK (sw.js, manifest e íconos en dist)
npm.cmd run test:e2e    # desktop + móvil (Pixel 7)
```

Pruebas nuevas: `design-tokens-contrast.test.ts` (contraste AA real) y
`ui-primitives.test.tsx` (menú de acciones, fila tocable, guardia de descarte,
avisos). Las pruebas de las 12 suites afectadas se actualizaron al menú "⋯" y a
la navegación por módulos.

## 10. Despliegue

Solo frontend:

```bash
docker compose build web && docker compose up -d web
```

En el teléfono la PWA avisará "Hay una versión nueva" (se acabó el `Ctrl+F5`).

## 11. Pendientes sugeridos

- Gesto de arrastre para cerrar las hojas (solo desde la agarradera).
- Migrar `PurchaseDetailDialog` y `StatementDetailDialog` a secciones con
  pestañas internas si crecen más.
- Resaltado del elemento activo de la barra inferior con microanimación sutil.
