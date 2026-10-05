# Fase 6 — Optimización y despliegue

## 1. Objetivo

Cerrar el proyecto con el rendimiento cuidado, lectura sin conexión y una guía
de despliegue reproducible en el mismo dominio que la API.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| Code splitting | Todas las páginas se cargan con `React.lazy` por ruta (un `Suspense` en `SessionGate`). El chunk principal baja de **748 KB a 386 KB (121 KB gzip)** y cada pantalla pesa entre 1 y 20 KB |
| Modo sin conexión | `NetworkFirst` para las lecturas de la API (caché de 24 h, 150 entradas, 5 s de espera antes de usar la copia) + precache del shell; las mutaciones requieren conexión |
| Aviso sin conexión | Banner en el shell cuando el navegador pierde la red, con `useOnlineStatus` |
| Despliegue | `deploy/nginx.conf.example`: estáticos en `/`, `/api` y `/health` al backend, sin caché para `sw.js`/`manifest`/`index.html` y caché inmutable para `assets/` |
| Accesibilidad | Landmarks (`main`/`nav` con `aria-label`), `aria-current` de los enlaces, foco visible, `aria-describedby`/`aria-invalid` en formularios y avisos con `role="status"`/`alert` |
| Pruebas | 1 archivo nuevo (65 pruebas en total) |

## 3. Decisiones

- **Precache completo con carga bajo demanda**: el service worker guarda todos
  los chunks (792 KB, en segundo plano) pero el primer render solo descarga el
  shell; al visitar una ruta se carga su chunk desde la caché.
- **Offline de solo lectura**: se evita a propósito la cola de mutaciones sin
  conexión; las operaciones financieras requieren red para no duplicar ni
  aplicar datos dudosos.
- **Íconos SVG** en el manifest (Chrome los acepta); si algún día se exige PNG,
  basta generar 192/512 a partir de los SVG.
- **`Content-Disposition`** del backend se respeta en la exportación; nginx no
  interviene.

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 24 archivos / 65 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # sin avisos de tamaño; 66 entradas precacheadas
```

Build final:

| Recurso | Tamaño | Gzip |
|---|---|---|
| `index.js` (shell + vendor) | 386 KB | 121 KB |
| Página más pesada (`IncomePage`) | 20 KB | 5.8 KB |
| CSS | 23 KB | 5.4 KB |

Prueba nueva: el aviso de “Sin conexión” aparece al disparar `offline` y
desaparece con `online`.

## 5. Despliegue (resumen)

1. `npm.cmd run build` en `cuentas-web`.
2. Copiar `dist/` al servidor (`/var/www/cuentas-web/dist`).
3. Usar `deploy/nginx.conf.example` como base del sitio.
4. API con PM2 o Docker (`cuentas-api`), escuchando en `127.0.0.1:3000`.
5. Verificar `GET /health` a través del dominio y que el service worker se
   registre sin caché en `sw.js`.

## 6. Notas finales

- **Lighthouse** queda como paso manual en un navegador real: en este equipo no
  hay Chrome headless instalado. El build ya no tiene avisos de tamaño, hay
  manifiesto, service worker, temas de contraste y navegación por teclado.
- El README del proyecto lista las seis fases y enlaza esta documentación.
