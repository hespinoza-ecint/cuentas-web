# Fase 31 — Importación de compras desde Excel (web)

Fecha: 2026-10-15. Ámbito: `cuentas-web`.

## Contexto y decisiones

### 1. Parseo en el navegador, con carga diferida

El `.xlsx` se lee en el navegador con `read-excel-file/browser` (9.3.12,
mantenido, dependencias `fflate` + `saxen`), importado de forma dinámica: el
chunk solo se descarga al usar el diálogo. La API recibe JSON ya tipado y
validado por class-validator.

- Alternativas descartadas: `xlsx` (npm congelado en 0.18.5) y `exceljs`
  (21 MB, sin release desde 2024).
- Nota de implementación: la API v9 expone `readSheet` (una hoja) además del
  default `readXlsxFile`, que devuelve **todas** las hojas como
  `{sheet, data}[]`. Se usa `readSheet` y una prueba de regresión lo fija: el
  E2E destapó que un cast de tipos ocultaba la diferencia y el lector fallaba
  con archivos reales.

### 2. Todo o nada, con vista previa

Las marcas de posible duplicado y de corte pagado (RN-30) son avisos, no
errores: el import no las refiltra y decide el usuario (salen desmarcadas por
defecto). La única regla dura es la política de fechas (RN-06/RN-07): se valida
todo el lote antes de escribir y, si una fila falla, no se crea nada.

### 3. Confirmar compra por compra sin perder atomicidad

La revisión "una por una" es otra vista del mismo estado que la tabla (misma
casilla, mismas decisiones): al terminar se envía un solo POST transaccional.
Se descartó crear al confirmar cada una: dejaría importaciones a medias.

### 4. Duplicados por cantidad

Al aparear por fecha + monto + descripción normalizada, cada compra existente
marca cuando mucho una fila; las repeticiones legítimas dentro del archivo se
importan sin aviso.

### 5. Los errores locales también se ven

`ErrorAlert` solo renderizaba problemas RFC 9457; los mensajes del lector son
texto y caían al genérico "Ocurrió un error inesperado". Ahora los strings se
muestran tal cual (con prueba), así un archivo ilegible explica qué pasó.

## Consecuencias

- El botón de importación es exclusivo de escritorio; en móvil los E2E
  verifican que no existe.
- `e2e/fixtures/compras-ejemplo.xlsx` es un archivo sintético generado por
  `scripts/make-e2e-xlsx.mjs` (no se versionan estados de cuenta reales).
