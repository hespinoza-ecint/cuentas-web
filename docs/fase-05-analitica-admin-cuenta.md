# Fase 5 — Dashboard analítico, administración y cuenta/datos

## 1. Objetivo

Cerrar las funciones que quedaban de cara al usuario: gráfica de flujo
proyectado, herramientas de administración (reglas globales y mantenimiento) y
la gestión de la cuenta (exportación, eliminación con gracia y cancelación).

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `CashflowChart` | Gráfica SVG propia del flujo proyectado (línea + área, línea de cero, punto del mínimo y fechas), con el saldo inicial, el mínimo y su fecha en la descripción |
| Dashboard | La gráfica se integra bajo los indicadores, con los datos de `GET /cashflow/projection` |
| `/admin/reglas` (ADMIN) | Reglas globales: activar/desactivar y ajustar peso; avisa que aplica a todos los usuarios. Los ítems del menú se filtran por rol y la ruta tiene guarda (`RequireAdmin`) |
| `/admin/mantenimiento` (ADMIN) | Ejecuta `POST /admin/maintenance/run` y muestra el resultado (sesiones, tokens, idempotencia y cuentas purgadas) |
| `/cuenta` | Estado de la cuenta, **exportar JSON** (descarga con el nombre que manda el backend), **eliminar cuenta** (contraseña + confirmación explícita) y **cancelar eliminación** cuando está en gracia |
| Banner | Aviso permanente en el shell cuando `status = PENDING_DELETION`, con acceso a la gestión |
| Pruebas | 3 archivos nuevos/actualizados (64 pruebas en total) |

## 3. Decisiones

- **Gráfica SVG propia en lugar de una librería**: se evita sumar ~100 KB al
  bundle por un solo gráfico (la Fase 6 se enfoca justo en el tamaño). El
  componente tiene tooltips nativos (`<title>`) y no depende del DOM del
  navegador.
- **Administración solo para ADMIN**: el menú oculta los ítems y
  `RequireAdmin` muestra un aviso; aun así, la API es la que valida el rol
  (403 `INSUFFICIENT_ROLE`).
- **Eliminación con gracia**: al confirmar, el backend revoca todas las
  sesiones; la UI limpia el estado local y explica que para cancelar hay que
  iniciar sesión de nuevo. El usuario puede exportar antes de eliminar.
- **Exportación**: se descarga como blob desde la respuesta JSON, respetando
  el `content-disposition` del backend.

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 23 archivos / 64 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # producción + PWA
```

Cobertura nueva:

- **Dashboard**: la gráfica aparece con los datos de proyección.
- **Administración**: un usuario normal ve el aviso de "Solo administradores";
  un ADMIN ajusta una regla global (PATCH con `isEnabled`) y ejecuta el
  mantenimiento viendo el resultado.
- **Cuenta**: exportación (blob + aviso), eliminación (contraseña +
  confirmación y panel de "Eliminación programada") y cancelación con el banner
  de cuenta en gracia.

## 5. Notas

- Queda la **Fase 6**: división del bundle (code splitting por ruta), modo
  offline de lectura, accesibilidad, Lighthouse y despliegue con nginx.
- El dashboard analítico puede crecer en la Fase 6 con comparación de
  recomendaciones y rangos de fechas si hace falta.

## 6. Actualización — exportación completa y reset de datos (backend Fase 11)

- **Exportar datos** ahora descarga **todo**: perfil, preferencias, sesiones y las
  18 colecciones financieras (`schemaVersion: 2`).
- **Restablecer datos**: tarjetas en *Cuenta y datos* → diálogo con contraseña y
  confirmación. **Restablecer tarjetas** borra solo el dominio de tarjetas
  (tarjetas, libro, cortes, pagos, compras, planes y mensualidades) y conserva el
  efectivo, ingresos, gastos y recurrentes; **Restablecer datos** borra todo el
  historial financiero. Ambos invalidan toda la caché de consultas y muestran el
  aviso del backend. Se recomienda descargar la exportación antes.
- Cobertura nueva: reset en ambos alcances (ALL y CARDS) con contraseña y confirmación.
