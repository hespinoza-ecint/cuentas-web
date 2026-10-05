# Fase 4E — Recomendador, historial y reglas

> Con este bloque queda completa la Fase 4 (CRUDs financieros + recomendador).
> Sigue la Fase 5: dashboard analítico, administración y cuenta/datos.

## 1. Objetivo

Cerrar el ciclo del producto: pedir una recomendación de tarjeta, entender
**por qué** (motivos, advertencias, métricas y alternativas), registrar la
compra con esa recomendación ligada, revisar el historial reproducible y
ajustar las reglas del motor por usuario.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `/recomendador` | Formulario (monto, fecha, tipo, meses/tasa, tarjetas elegibles para MSI) y resultado explicado: tarjeta o efectivo, puntaje y nivel, días de financiamiento, costo de intereses, utilización, flujo mínimo y plan de pagos; motivos, advertencias, **alternativas** (con motivo de descarte) y disclaimer. Botón para **registrar la compra** con la recomendación ligada (`recommendationId`) y valores precargados |
| `/recomendaciones` | Historial paginado con resultado, tarjeta, monto y fecha; detalle **reproducible** que muestra el resultado guardado y los snapshots de contexto y reglas |
| `/reglas` | Reglas del motor (globales + personalizadas): activar/desactivar, ajustar **peso** de las de puntaje y restablecer al valor global |
| Dashboard | Botón principal “¿Qué tarjeta uso?” que lleva al recomendador |
| Pruebas | 1 archivo nuevo (58 pruebas en total) |

## 3. Decisiones

- **El resultado se pinta de forma compartida** entre el recomendador y el
  historial (`RecommendationResultView`), así el detalle guardado se ve igual
  que la consulta original.
- **No hay endpoints de admin en la UI**: ajustar reglas globales sigue siendo
  del backend (el usuario solo personaliza las suyas), en línea con el
  aislamiento por usuario.
- **El formulario limpia el resultado anterior** al enviar una nueva consulta
  para evitar confusión entre respuestas.
- **Registrar compra** precarga tarjeta recomendada, monto, fecha, tipo y
  meses, y manda `recommendationId` (el backend valida que sea del usuario).

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 21 archivos / 58 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # producción + PWA
```

Cobertura nueva:

- Recomendador: envío (monto en centavos, fecha del usuario, tipo) y resultado
  con motivos, alternativas descartadas con su razón, y disclaimer.
- Historial: listado y detalle reproducible con snapshots.
- Reglas: personalizar (desactivar) y restablecer un override.

## 5. Estado de la Fase 4

| Bloque | Estado |
|---|---|
| 4A Cuentas, movimientos y categorías | ✅ |
| 4B Gastos y recurrentes | ✅ |
| 4C Ingresos | ✅ |
| 4D Tarjetas, pagos y compras | ✅ |
| 4E Recomendador, historial y reglas | ✅ |

Quedan para las siguientes fases: dashboard analítico con gráfica de flujo,
administración (reglas globales y mantenimiento para admin), cuenta y datos
(exportar, eliminar, cancelar eliminación) y la optimización de la PWA.
