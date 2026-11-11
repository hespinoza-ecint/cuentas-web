# Fase 37 — Listas y cabecera (bloque E de la auditoría)

## 1. Objetivo

Aplicar el bloque E de la [auditoría UX/UI](auditoria-ux-ui.md): menos cajas y
menos cromo en las pantallas de lista, y acciones de fila más fáciles de tocar.

## 2. Qué cambia para el usuario

| # (auditoría) | Antes | Ahora |
|---|---|---|
| UI-5 | Cada fila era una tarjeta (borde + sombra + radio) con 8 px entre filas | Una sola tarjeta por lista, con divisores entre filas |
| UX-16 | "⋯" de 36 px pegado a una fila tocable; menú desplegable que podía quedar bajo la barra inferior | "⋯" de 44 px en móvil; el menú se abre como hoja de acciones anclada abajo, con velo y opciones de 48 px |
| UX-11 | Cabecera móvil con el nombre de la app y, debajo, el título de la página | La cabecera nombra la pantalla ("Movimientos", "Tarjetas"…); el título de la página queda solo para lectores de pantalla |
| UX-12 | "Ajuste manual" era el botón primario de Movimientos | Botón secundario |
| UX-19 | Cada ocurrencia de Recurrentes tenía "Confirmar" y "Omitir" con el mismo peso | "Confirmar" en la fila; "Omitir" en el "⋯" |
| 3.5 | El botón "Filtros" medía 20 px de alto | Toda la cabecera de la tarjeta de filtros es tocable (52 px) |

Pantallas con lista agrupada: Movimientos, Gastos, Recurrentes, Cuentas, Compras,
Pagos, Historial de recomendaciones y Categorías.

## 3. Cambios

| Archivo | Cambio |
|---|---|
| `src/components/ui/list-row.tsx` | Nuevo `ListGroup`; `ListRow` ya no dibuja su propia tarjeta |
| 7 páginas de lista (`features/**/…Page.tsx`) | `<ul className="space-y-2">` → `<ListGroup>` |
| `src/features/categories/CategoriesPage.tsx` | Divisores en lugar de cajas dentro de la tarjeta |
| `src/components/ui/action-menu.tsx` | Objetivo de 44 px; hoja de acciones en móvil con clases `max-sm:` |
| `src/app/AppShell.tsx` | Título de la pantalla en la cabecera móvil |
| `src/components/ui/page-header.tsx` | `h1` con `max-md:sr-only` cuando no hay enlace "volver" |
| `src/features/movements/MovementsPage.tsx` | "Ajuste manual" secundario |
| `src/features/expenses/RecurringPage.tsx` | "Omitir" dentro de `ActionMenu` |
| `src/components/ui/filters-card.tsx` | Cabecera completa como botón |

## 4. Decisiones

- **La hoja de acciones es solo CSS.** El menú conserva su `role="menu"`, su
  manejo de foco y sus pruebas; en móvil las clases `max-sm:` lo anclan abajo y
  oscurecen el fondo. No hay un segundo componente ni detección de dispositivo.
- **`ListGroup` no lleva `overflow-hidden`**: recortaría el menú de escritorio,
  que se posiciona junto al "⋯".
- **El título no se elimina: se oculta visualmente.** El `h1` sigue en el
  documento (`sr-only`) para lectores de pantalla y para las pruebas, que lo usan
  como señal de carga ("Hola, …"). El texto de la cabecera lleva `aria-hidden`
  para que no se anuncie dos veces.
- **Las pantallas de detalle conservan su título visible** (por ejemplo, el
  alias de la tarjeta): ese texto no está en la navegación y la cabecera no
  podría mostrarlo.
- **"Ajuste manual" queda como botón secundario, no dentro de un "⋯".** Mismo
  efecto (deja de ser la acción dominante) sin cambiar los selectores de las
  pruebas ni agregar un menú para una sola acción.
- **El cambio de tema sigue en la cabecera.** Quitarlo (auditoría, UX-20) no era
  parte de este bloque.

## 5. Fuera de esta fase

- **Filtros como chips**: se resolvió solo el objetivo táctil.
- **Sacar "Cuentas" del módulo Movimientos**: cambia `nav.ts` y las etiquetas de
  las que depende el E2E móvil; la fase 33 ya dejó visible la pestaña activa.
- **Divisor visible entre la fila y el "⋯"**: con 44 px de objetivo no hizo falta.

## 6. Pruebas

| Archivo | Qué cubre |
|---|---|
| `src/app/app-shell-mobile.test.tsx` | La cabecera muestra la pantalla actual; el `h1` lleva `max-md:sr-only` |
| `src/features/expenses/recurring.test.tsx` | "Omitir" ya no es un botón de la fila: se llega por el menú |

## 7. Verificación

| Comando | Resultado (11 nov 2026) |
|---|---|
| `npm.cmd run lint` | sin hallazgos |
| `npm.cmd run build` | correcto |
| `npm.cmd run test` | 38 archivos, 173 pruebas, todas pasan (entre dos corridas: los archivos que no arrancaron por "Failed to start threads worker" pasaron al repetirlos) |
| `npm.cmd run test:e2e` | **no se corrió** en esta fase (requiere volver a resetear `Cuentas_Test`) |

La primera corrida completa dio dos fallas reales, ya corregidas:

- El menú de la ocurrencia y el de la fila del mismo recurrente tenían el mismo
  nombre accesible ("Más acciones de Renta"). El de la ocurrencia ahora es
  "Acciones de la ocurrencia de …".
- La prueba nueva de la cabecera buscaba "el" `banner` y la página tiene dos
  elementos `<header>`.

**Riesgo abierto para el E2E:** el `h1` queda como `sr-only` en móvil y
`e2e/mobile.spec.ts` espera que "Hola, Móvil" sea visible. Playwright considera
visible un elemento de 1 × 1 px, así que debería pasar, pero no está comprobado.

Validación en pantalla (API local contra `Cuentas_Test`, 375 × 812, tema claro),
en Movimientos con dos movimientos:

| Qué | Medido |
|---|---|
| Cabecera | Muestra "Movimientos"; el `h1` mide 1 × 1 px |
| Primera fila | En y = 294 (antes 321) |
| Lista | Una tarjeta de 343 px con las dos filas y un divisor |
| "⋯" | 44 × 44 px (antes 36) |
| Menú de fila | `position: fixed`, pegado al borde inferior, opción de 48 px; el foco entra al menú y Escape lo cierra y devuelve el foco al "⋯" |
| "Filtros" | 52 px de alto (antes 20) |
| "Ajuste manual" | Botón secundario (fondo blanco) |

No se vio en pantalla: las otras siete listas, Recurrentes con ocurrencias (lo
cubre su prueba), el menú de escritorio, las pantallas de detalle ni el tema
oscuro.
