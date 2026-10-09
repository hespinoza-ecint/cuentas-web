# Fase 19 — Sistema de color semántico (claro/oscuro)

## 1. Objetivo

Redefinir por completo los colores de la PWA con una paleta financiera moderna,
limpia y accesible: **tokens con nombre de uso** (`--color-surface`, `--color-ink`,
`--color-danger`…) definidos una sola vez en `src/index.css`, sin clases `dark:`
por componente y sin colores fijos en el código.

## 2. Problemas que se corrigen

El esquema de la fase 13 invertía la escala `slate` dentro de `.dark`. Eso
producía varios efectos no deseados:

- El botón primario (`bg-slate-900 text-white`) se veía casi **blanco** en modo
  oscuro: la inversión no distingue intención de color.
- Algunos tonos colapsaban (`slate-50` y `slate-100` compartían valor; también
  `slate-400` y `slate-500`), así que se perdía jerarquía.
- Había parches fuera de la paleta: `.dark .text-red-600`,
  `.dark .text-emerald-600`, el `dark:bg-slate-950` del `AppShell` y colores
  hexadecimales fijos en `CashflowChart` y `LoadingScreen`.
- No existía un color de marca: lo "primario" era negro.

## 3. Decisiones de diseño

- **Marca índigo** (`#4f46e5`): transmite confianza, es sobria y no compite con
  el verde de ingresos ni el rojo de gastos. El botón primario y el FAB usan la
  marca; la navegación activa usa el relleno suave (`brand-soft`/`brand-ink`).
- **Gastos en rojo e ingresos en verde** con tokens de dominio (`expense`,
  `income`) separados de `danger`/`success`, para poder desacoplarlos después
  sin tocar componentes.
- **Botón destructivo fijo**: `danger-solid` (`#dc2626`) con texto blanco se
  conserva en ambos temas (4.8:1); no cambia al oscurecer.
- **Pantallas siempre oscuras**: acceso, carga, health y 404 usan `inverse`
  (`#0a0f1c`) sin importar el tema.
- **Modo oscuro sin negro ni blanco puros**: azul medianoche (`canvas #0a0f1c`,
  `surface #141d31`) para reducir la fatiga visual y el halo del texto claro.
- **Texto atenuado que cumple AA en todos sus fondos**: `ink-muted` (`#5d6b80`
  claro, `#8b99ae` oscuro) se usa también en textos pequeños y placeholders.

## 4. Paleta

Contrastes calculados con la fórmula WCAG 2.x (AA texto ≥ 4.5:1; bordes de
controles ≥ 3:1).

### Modo claro

| Rol | Token | Hex | Contraste |
|---|---|---|---|
| Fondo de la app | `canvas` | `#f4f6fa` | — |
| Superficies (tarjetas, cabecera, menús, diálogos) | `surface` | `#ffffff` | — |
| Hover y fondos suaves | `surface-subtle` | `#eef2f7` | — |
| Skeleton, banner neutro, barras | `surface-strong` | `#e2e8f0` | — |
| Pantallas siempre oscuras | `inverse` | `#0a0f1c` | — |
| Velo de diálogos (`bg-overlay/60`) | `overlay` | `#05080f` | — |
| Divisores y bordes de tarjeta | `line` | `#e2e8f0` | — |
| Bordes de inputs y checkboxes | `line-strong` | `#8a96a8` | 3.0:1 |
| Texto primario | `ink` | `#0f172a` | 17.8:1 |
| Texto secundario | `ink-secondary` | `#475569` | 7.6:1 |
| Texto atenuado | `ink-muted` | `#5d6b80` | 5.4:1 |
| Marca | `brand` / `brand-hover` | `#4f46e5` / `#4338ca` | 6.3:1 con blanco |
| Marca suave (nav activa) | `brand-soft` / `brand-ink` | `#eef2ff` / `#4338ca` | 7.1:1 |
| Éxito / ingresos | `success` | `#047857` | 5.5:1 |
| Peligro / gastos / alertas | `danger` | `#b91c1c` | 6.5:1 |
| Botón destructivo | `danger-solid` | `#dc2626` | 4.8:1 con blanco |
| Aviso | `warning` | `#b45309` | 5.0:1 |

Los pares de avisos usan `-soft` de fondo, `-line` de borde y `-ink` de texto:
éxito `#ecfdf5`/`#a7f3d0`/`#065f46` (7.3:1), peligro `#fef2f2`/`#fecaca`/`#991b1b`
(7.6:1), aviso `#fffbeb`/`#fde68a`/`#92400e` (6.8:1) e informativo
`#f0f9ff`/`#bae6fd`/`#075985` (7.1:1).

### Modo oscuro

| Rol | Token | Hex | Contraste |
|---|---|---|---|
| Fondo de la app | `canvas` | `#0a0f1c` | — |
| Superficies | `surface` | `#141d31` | — |
| Hover y fondos suaves | `surface-subtle` | `#1c2740` | — |
| Skeleton, barras | `surface-strong` | `#26324a` | — |
| Divisores | `line` | `#26324a` | — |
| Bordes de inputs | `line-strong` | `#5b6b86` | 3.1:1 |
| Texto primario | `ink` | `#e6ebf2` | 14.0:1 |
| Texto secundario | `ink-secondary` | `#a9b4c4` | 8.3:1 |
| Texto atenuado | `ink-muted` | `#8b99ae` | 5.8:1 |
| Marca | `brand` / `brand-hover` | `#818cf8` / `#a5b4fc` | 6.3:1 con texto oscuro |
| Marca suave | `brand-soft` / `brand-ink` | `#1e2250` / `#a5b4fc` | 7.5:1 |
| Éxito / ingresos | `success` | `#34d399` | 8.7:1 |
| Peligro / gastos | `danger` | `#f87171` | 6.1:1 |
| Aviso | `warning` | `#fbbf24` | 10.4:1 |

`inverse`, `overlay`, `on-accent`, `danger-solid*` y el texto sobre `inverse`
no se redefinen: valen igual en ambos temas.

## 5. Estructura en `src/index.css`

- `@theme` abre con `--color-*: initial`, que **borra la paleta por defecto de
  Tailwind**: una clase como `bg-slate-500` deja de generar CSS y no puede
  colarse por error. Ahí viven los tokens del modo claro.
- `.dark` redefine exactamente los mismos tokens. Como las utilidades
  referencian `var(--color-*)`, el cambio de tema es automático.
- `body` toma `canvas` e `ink` como base.
- La variante `dark:` sigue declarada solo para excepciones documentadas; los
  componentes no la usan.

## 6. Migración (equivalencias)

| Antes | Ahora |
|---|---|
| `text-slate-900` | `text-ink` |
| `text-slate-700`, `text-slate-600` | `text-ink-secondary` |
| `text-slate-500`, `text-slate-400` | `text-ink-muted` |
| `bg-white` | `bg-surface` |
| `bg-slate-100 dark:bg-slate-950` (fondo de la app) | `bg-canvas` |
| `bg-slate-50`, hover `bg-slate-100` | `bg-surface-subtle` |
| `bg-slate-200`, pistas de barras | `bg-surface-strong` |
| `border-slate-100/200`, `divide-slate-100` | `border-line` / `divide-line` |
| `border-slate-300` (inputs, checkboxes) | `border-line-strong` |
| `bg-slate-900 text-white hover:bg-slate-700` | `bg-brand text-on-brand hover:bg-brand-hover` |
| Nav activa `bg-slate-900 text-white` | `bg-brand-soft text-brand-ink` |
| `focus:border-slate-500`, `focus:ring-slate-200` | `focus:border-focus`, `focus:ring-focus/25` |
| `bg-slate-950` (auth, carga, 404) | `bg-inverse` |
| `bg-slate-950/50` (velo) | `bg-overlay/60` |
| `text-red-600` (alertas) | `text-danger` |
| `text-red-600` / `text-emerald-600` (montos) | `text-expense` / `text-income` |
| `border-red-200 bg-red-50 text-red-800` | `border-danger-line bg-danger-soft text-danger-ink` |
| `bg-red-600 hover:bg-red-700` | `bg-danger-solid hover:bg-danger-solid-hover` |
| `emerald-*` | `success-*` / `income` |
| `amber-*` | `warning-*` |
| `sky-*` | `info-*` |
| Hex de `CashflowChart` | `stroke-chart-line`, `fill-chart-area`, `stroke-chart-grid`, `fill-danger` |
| `text-[#cbd5e1]` de `LoadingScreen` | `text-on-inverse-muted` |

## 7. Protección contra regresiones

`src/lib/design-tokens.test.ts` recorre las fuentes de `src` (vía
`import.meta.glob` con `?raw`) y falla si encuentra:

1. Utilidades con la paleta por defecto de Tailwind (`bg-slate-500`, `text-red-600`…).
2. La variante `dark:` en cualquier componente.
3. Colores hexadecimales en el código.

El mensaje de fallo indica archivo, línea y la regla incumplida.

## 8. Barra del sistema (theme-color)

- `index.html` mantiene un valor inicial (`#0a0f1c`) y el script anti-destello
  lo ajusta al tema antes del primer render.
- `syncThemeColor()` en `src/lib/theme.ts` lo re-sincroniza en cada cambio de
  tema leyendo `--color-canvas` (una sola fuente de verdad: `index.css`).
- El manifiesto de la PWA (`vite.config.ts`) usa azul medianoche para splash y
  arranque.

## 9. Archivos

| Archivo | Cambio |
|---|---|
| `src/index.css` | Tokens del sistema (light en `@theme`, dark en `.dark`), `--color-*: initial` y base de `body` |
| 60 archivos de `src/` (app, components y features) | Migración de clases a tokens (454 reemplazos) |
| `src/lib/design-tokens.test.ts` | Nuevo: guardia contra la paleta por defecto, `dark:` y colores fijos |
| `src/lib/theme.ts` | `syncThemeColor()` para la barra del sistema |
| `index.html` | Meta `theme-color` inicial + ajuste en el script anti-destello |
| `vite.config.ts` | `theme_color`/`background_color` del manifiesto |

## 10. Verificación

```powershell
npm.cmd run lint        # limpio
npm.cmd run build       # OK (CSS 28.2 kB; sin tokens slate/red/emerald/amber/sky)
npm.cmd run test        # toda la suite, incluida la guardia; en OneDrive el pool
                        # de hilos puede pedir reintentar archivos sueltos
npm.cmd run test:e2e    # escritorio + móvil (backend real y SQLite E2E)
```

## 11. Despliegue

Solo frontend:

```bash
docker compose build web && docker compose up -d web
```

Recarga con `Ctrl+F5` (o reabre la PWA) para que entre el service worker nuevo.
