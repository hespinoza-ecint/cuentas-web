# Fase 31 — Importar compras desde Excel (RN-31)

## 1. Objetivo

Cargar un estado de cuenta (`.xlsx`) en la versión de escritorio: elegir la
tarjeta, revisar la vista previa con avisos y crear las compras en una sola
operación.

## 2. Flujo

- Botón "Importar Excel" en el encabezado de Compras, solo escritorio
  (`hidden md:inline-flex`); deshabilitado si no hay tarjetas activas.
- El diálogo pide la tarjeta (solo activas) y el archivo `.xlsx`.
- El archivo se lee en el navegador con `read-excel-file/browser` (carga
  diferida: el chunk solo se descarga al abrir el diálogo). Límites: 2 MB y
  500 filas. Encabezados por nombre (`Fecha`, `Descripción/Nombre/Concepto/Comercio`,
  `Compras/Monto/Cantidad/Importe/Cargo`); fechas y montos como texto o celdas
  nativas de Excel.
- Vista previa (`POST /purchases/import/preview`): por fila muestra los
  duplicados (mismo día, monto y descripción normalizada) y los cortes pagados
  (RN-30), desmarcados; las fechas fuera de rango (RN-06/RN-07) y las filas
  ilegibles quedan bloqueadas con su motivo.
- Revisión paso a paso ("Revisar una por una", sobre las filas importables):
  Incluir / Omitir / Anterior y descripción editable; al confirmar una
  descripción corregida se vuelven a pedir los avisos sin pisar decisiones.
- "Importar N compras" envía una sola vez (`POST /purchases/import`, idempotente
  por intento); al terminar, toast e invalidación financiera compartida.

## 3. Cambios

| Archivo | Cambio |
|---|---|
| `src/features/purchases/import/parse-purchase-rows.ts` | Parser puro (encabezados flexibles, fechas y montos a centavos) |
| `src/features/purchases/import/read-purchases-file.ts` | Lector `.xlsx` con `readSheet` bajo demanda y límites |
| `src/features/purchases/ImportPurchasesDialog.tsx` | Diálogo (tabla + revisión paso a paso) |
| `src/features/purchases/purchases-api.ts` | `previewPurchaseImport` e `importPurchases` |
| `src/components/shared/ErrorAlert.tsx` | Muestra también mensajes de texto (errores locales del lector) |

## 4. Pruebas

```powershell
npx.cmd vitest run src/features/purchases/import
npx.cmd vitest run src/features/purchases/import-purchases.test.tsx
npm.cmd run test:e2e
```

- parser: texto del estado de cuenta, fechas nativas/serie/dd-mm-aaaa, encabezado
  con acentos y en otro orden, abonos y filas ilegibles, descripciones largas y
  archivo sin encabezado;
- lector: extensión, tamaño y conversión de la primera hoja (prueba de regresión
  de la API v9: `readSheet`, no el default con `{sheet, data}[]`);
- diálogo: filas desmarcadas y bloqueadas, total, envío solo de las marcadas,
  error de la API, error de lectura y revisión paso a paso
  (editar/incluir/omitir/anterior);
- E2E: registro + tarjeta + archivo sintético
  (`e2e/fixtures/compras-ejemplo.xlsx`, generado con
  `node scripts/make-e2e-xlsx.mjs`) → revisión → lista; en móvil el botón no es
  visible.

## 5. Compatibilidad

- Requiere los endpoints de la fase 31 de la API (mismo número de fase).
- `read-excel-file` entra al bundle solo como chunk diferido (no pesa en el
  arranque de la PWA).
