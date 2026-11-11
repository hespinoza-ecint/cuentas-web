# Fase 38 — Oscuro cálido (bloque F de la auditoría)

## 1. Objetivo

Aplicar el bloque F de la [auditoría UX/UI](auditoria-ux-ui.md): que el modo
oscuro pertenezca a la misma familia que el claro. El claro es papel cálido; el
oscuro era azul medianoche, mientras que acceso, carga y 404 (`inverse`) ya eran
carbón cálido. La temperatura saltaba al iniciar sesión.

No es un arreglo de accesibilidad: el oscuro anterior ya pasaba AA.

## 2. Qué cambia para el usuario

| # (auditoría) | Antes | Ahora |
|---|---|---|
| UI-19 | Fondo y superficies azul medianoche (`#0f141d`, `#161d2a`) | Carbón cálido (`#141311`, `#1c1b18`), de la familia de `inverse` (`#1a1915`) |
| UI-19 | Texto gris azulado | Gris cálido, con el mismo contraste o mayor |
| UI-18 | La pantalla de carga era siempre oscura: en tema claro parpadeaba entre dos pantallas claras | Usa el fondo del tema activo |

Los acentos no cambian: marca `#8fa8ff`, éxito `#3ddc97`, peligro `#f28b84`,
aviso `#e5b13a`, info `#67b8ef`.

## 3. Tokens (`.dark` en `src/index.css`)

Ratios contra la superficie nueva `#1c1b18`, salvo que se indique.

| Token | Antes | Ahora | Ratio |
|---|---|---|---|
| `canvas` | `#0f141d` | `#141311` | — |
| `surface` | `#161d2a` | `#1c1b18` | — |
| `surface-subtle` | `#1e2737` | `#262521` | — |
| `surface-strong` | `#29344a` | `#33312c` | — |
| `line` | `#273349` | `#2f2d28` | 1.25 (decorativo) |
| `line-strong` | `#6b7d99` | `#7f7b6f` | 4.07 |
| `ink` | `#e9edf4` | `#eceae4` | 14.32 |
| `ink-secondary` | `#b6bfcd` | `#bdb9ae` | 8.79 |
| `ink-muted` | `#96a2b5` | `#9d998d` | 6.05 (5.39 sobre `surface-subtle`) |
| `on-brand` | `#0f141d` | `#141311` | 8.15 sobre `brand` |
| `brand-soft` | `#1d2745` | `#1f2640` | 7.59 (`brand-ink` encima) |
| `success-soft` | `#0d2b22` | `#10291f` | 10.26 (`success-ink` encima) |
| `danger-soft` | `#33161a` | `#33181a` | 8.67 (`danger-ink` encima) |
| `warning-soft` | `#29220d` | `#2a220e` | 10.34 (`warning-ink` encima) |
| `info-soft` | `#0c2132` | `#10222f` | 10.15 (`info-ink` encima) |
| `expense` | `#e9edf4` | `#eceae4` | 14.32 (sigue a `ink`) |
| `chart-area` | `#26315a` | `#2a315a` | 1.38 (decorativo) |
| `chart-grid` | `#33405a` | `#45423b` | 1.72 (decorativo) |

## 4. Cambios

| Archivo | Cambio |
|---|---|
| `src/index.css` | Bloque `.dark` con los valores de arriba |
| `index.html` | `theme-color` oscuro `#141311` (valor inicial y script anti-destello) |
| `vite.config.ts` | `theme_color` y `background_color` del manifest de la PWA |
| `src/components/shared/LoadingScreen.tsx` | `bg-canvas` + `text-ink-muted` en vez de `inverse` |

`src/lib/theme.ts` no cambió: lee el fondo desde el token.

## 5. Decisiones

- **Solo cambian los neutros y los fondos suaves.** Los acentos ya contrastaban
  bien y son los que dan identidad; entibiar también los fondos suaves evita que
  un aviso azulado flote sobre una superficie cálida.
- **`expense` repite el HEX de `ink`** (igual que en la fase 34) para que la
  prueba de contraste lo siga leyendo.
- **La pantalla de carga usa el tema, no `inverse`.** Lleva a la app en el caso
  frecuente (sesión iniciada). Quien no tiene sesión ve ahora carga clara y luego
  el acceso oscuro: el parpadeo cambia de lado, pero afecta al caso raro.
- **Los iconos de la PWA no se regeneraron.** `scripts/gen-icons.mjs` no usa el
  fondo oscuro de la app.

## 6. Verificación

| Comando | Resultado (11 nov 2026) |
|---|---|
| `npm.cmd run lint` | sin hallazgos |
| `npm.cmd run build` | correcto |
| `npm.cmd run test` | 38 archivos, 173 pruebas, todas pasan en una sola corrida |
| `design-tokens-contrast.test.ts` | los pares declarados pasan AA con la paleta nueva en ambos temas |
| `npm.cmd run test:e2e` | 4 pruebas pasan en 5.3 min (segundo intento: en el primero el `webServer` agotó los 300 s durante el reset y seed de `Cuentas_Test`, como advierte AGENTS.md) |

Validación en pantalla (API local contra `Cuentas_Test`, 375 × 812):

| Tema | Pantalla | Resultado |
|---|---|---|
| Oscuro | Tokens en vivo | `--color-canvas` `#141311`, `--color-surface` `#1c1b18`, `--color-ink` `#eceae4`; `theme-color` `#141311` |
| Oscuro | Inicio (primer uso y con una cuenta) | Tarjetas, enlaces y botón "＋" legibles sobre el carbón |
| Oscuro | Hoja "Nueva cuenta" | Campos, foco y botones correctos |
| Oscuro | Cuentas (lista) y gráfica de flujo | Área y rejilla de la gráfica visibles; línea del colchón en ámbar |
| Claro | Pantalla de carga | Fondo papel (`rgb(246, 245, 241)`), ya no oscura |
| Claro | Movimientos | Sin cambios respecto a la fase 37 |

No se vio en pantalla: los avisos de color (éxito, peligro, aviso, info) sobre
sus fondos suaves nuevos —los cubre la prueba de contraste—, el escritorio ni la
PWA instalada (color del manifest).
