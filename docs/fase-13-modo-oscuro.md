# Fase 13 — Modo oscuro

## 1. Objetivo

Ofrecer un tema oscuro completo (claro, oscuro o el del sistema) sin duplicar
clases en cada pantalla y sin destellos blancos al cargar.

## 2. Cómo funciona

Tailwind 4 emite los colores del tema como variables CSS y las utilidades las
referencian (`bg-slate-100` → `background-color: var(--color-slate-100)`). Eso
permite **redefinir la paleta una sola vez** bajo la clase `.dark` en
`src/index.css`; toda la app se oscurece sin tocar los componentes.

| Token | En claro | En oscuro |
|---|---|---|
| `white` | superficies blancas | `#0f172a` (superficie: tarjetas, cabecera, hojas) |
| `slate-100/50` | fondos sutiles y hover | `#1e293b` |
| `slate-200/300` | bordes | `#334155` / `#475569` |
| `slate-500…900` | textos | grises claros (`#94a3b8` … `#f8fafc`) |
| `slate-950` | — | se conserva oscuro (overlay de diálogos y pantallas de acceso) |
| `red/emerald/amber/sky` 50–200 | fondos de avisos y badges | tonos profundos con texto claro |

Tres ajustes puntuales fuera de la paleta:

- `.dark .text-red-600` y `.dark .text-emerald-600` usan la tonalidad 400: los
  montos y errores no pierden contraste sobre fondo oscuro.
- `--color-on-accent` (`text-on-accent`): texto que **no** se invierte, para
  botones sobre fondos de acento (peligro, reintentar).
- La pantalla de carga usa un gris literal porque siempre vive sobre fondo
  oscuro.

## 3. Selector de tema

| Pieza | Comportamiento |
|---|---|
| Botón de la cabecera (`ThemeToggle`) | Alterna claro ↔ oscuro con un clic (sol/luna), disponible en móvil y escritorio |
| Hoja "Más" → Tema | Tres estados explícitos: **Claro · Oscuro · Sistema** (`aria-pressed`) |
| Persistencia | `localStorage` (`cuentas.theme`); sin preferencia guardada se sigue al sistema |
| Sin destello | Script mínimo en `index.html` aplica la clase antes del primer render; `initTheme()` la reafirma y escucha cambios del sistema |
| Navegador | `color-scheme: dark` bajo `.dark`: scrollbars, selects y date pickers nativos se adaptan |

`src/lib/theme.ts` expone `useTheme()` (preferencia, tema efectivo, alternar) y
`setThemePreference()`, con el patrón `useSyncExternalStore`; en entornos sin
`matchMedia` (jsdom) usa claro por defecto.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/index.css` | Variante `dark`, token `on-accent` y redefinición de la paleta en `.dark` |
| `src/lib/theme.ts` | Nuevo: preferencia, persistencia, `useTheme()` |
| `src/components/ui/theme-toggle.tsx` | Nuevo: botón sol/luna |
| `src/app/AppShell.tsx` | Botón en la cabecera y selector de tema en la hoja "Más"; fondo `dark:bg-slate-950` |
| `index.html` | Script anti-destello (coincide con `theme.ts`) |
| `src/main.tsx` | `initTheme()` antes de montar |
| `Button` / `HealthPage` / `LoadingScreen` / `CashflowChart` | Ajustes de contraste del tema |

## 5. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 26 archivos / 78 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # OK
npm.cmd run test:e2e    # 3 pruebas (escritorio + móvil)
```

- `src/lib/theme.test.ts`: aplica/persiste el tema, alterna y respeta "system".
- `src/app/app-shell-mobile.test.tsx`: el botón alterna y el selector de la
  hoja "Más" muestra los tres estados.
- E2E móvil: activa el modo oscuro, **recarga** y comprueba que se recuerda.

## 6. Despliegue

Solo frontend:

```bash
docker compose build web && docker compose up -d web
```

Recarga con `Ctrl+F5` (o reabre la PWA) para que entre el service worker nuevo.
