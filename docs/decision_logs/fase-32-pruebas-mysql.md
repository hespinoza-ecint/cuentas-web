# Fase 32 — Pruebas contra MySQL (`Cuentas_Test`)

Fecha: 2026-10-19. Ámbito: `cuentas-api` y `cuentas-web` (E2E).

## Contexto y decisiones

### 1. Una sola base de pruebas en el servidor

Jest y Playwright usan la base MySQL `Cuentas_Test` del servidor
(`mysql.penguino.dev`). La URL se deriva de `DATABASE_URL` en
`cuentas-api/.env` cambiando solo el nombre de la base, así que las
credenciales siguen en un único lugar y no se versionan. `TEST_DATABASE_URL`
permite cambiar host o credenciales; la base siempre se fuerza a `Cuentas_Test`.

- Alternativa descartada: una base por worker (`cuentas_test_1..5`). El pool
  existía porque SQLite bloquea escrituras concurrentes sobre el mismo
  archivo; MySQL soporta varias conexiones y las suites ya crean usuarios con
  prefijos únicos y filtran por `userId`. Solo `seed.spec.ts` hace conteos
  globales, y sus datos no cambian entre suites.
- Alternativa descartada: mantener SQLite en local y MySQL solo en CI. El
  objetivo es que las pruebas detecten las diferencias reales de MySQL
  (mayúsculas, collation, tipos) antes de desplegar.

### 2. Seguro contra la base equivocada

`global-setup`, `setup-env`, el E2E y `scripts/e2e-server.mjs` abortan si el
nombre de la base no es exactamente `Cuentas_Test`. El servidor usa
`lower_case_table_names = 0`, por lo que `cuentas_test` tampoco es válido.
Sin este seguro, un `prisma db push --force-reset` mal apuntado borraría
`cuentas`.

### 3. Reset y esquema

Cada corrida hace `mysql:schema` → `prisma generate` (MySQL) → `db push
--force-reset` → seed dos veces. Las migraciones de `prisma/migrations` son
de SQLite y no se aplican aquí; `db push` mantiene el esquema MySQL al día a
partir de `prisma/schema.mysql.prisma`.

### 4. Límites de conexión

Cada worker de Jest y el servidor E2E fijan `connection_limit=5`
(`TEST_DB_CONNECTION_LIMIT` lo ajusta). Con 4 workers son ~20 conexiones,
muy por debajo de `max_connections = 200` del servidor.

### 5. Bugs de MySQL que destapó la migración

Dos fallos que SQLite ocultaba y que se corrigieron en la API:

- **Purga de usuarios** (`MaintenanceService`): `user.delete()` solo confiaba
  en las cascadas, pero MySQL no puede resolverlas con las FK `Restrict`
  cruzadas (`CardPayment -> CashMovement`); la purga fallaba y el error se
  tragaba en el `catch`. Ahora usa `deleteUserData()` (mismo orden hijos ->
  padres que el reset de datos de `UsersService`) antes de borrar la cuenta.
- **Transacciones interactivas**: el default de Prisma (5 s) se agotaba en
  pagos de tarjeta contra el MySQL remoto. `PrismaService` fija
  `maxWait: 10 s` y `timeout: 30 s` para todas las transacciones.

## Consecuencias

- `npm test` y `npm run test:e2e` requieren red y acceso al MySQL del
  servidor. Son más lentos que SQLite local (el setup tarda ~1 minuto).
- Jest y E2E no deben correr a la vez: ambos resetean `Cuentas_Test`.
- SQLite queda solo para desarrollo local (`prisma/schema.prisma` y
  `prisma/migrations`); el respaldo `db:backup` sigue siendo exclusivo de
  SQLite.
- `npm run test:mysql` y `scripts/test-mysql.mjs` se eliminaron: `npm test`
  ya corre contra MySQL.
