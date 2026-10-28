# COALSUD · Backend

Proyecto Supabase del Sistema Comercial COALSUD: migraciones SQL, RLS, RPC, Edge Function, seeds y pruebas pgTAP. No hay servidor propio (⚙ DT-01).

La documentación (requerimientos, modelo de datos, seguridad, contrato de API) está en [`docs/`](docs/README.md).

## Requisitos

- Node 20+ y npm.
- Docker Desktop **abierto** (el stack local corre en contenedores).
- Monorepo (⚙ DT-12): `frontend/` es carpeta hermana de `backend/` dentro del mismo repo.

## Entorno en uso: dev en Supabase, sin Docker (⚙ DT-30)

El proyecto `VENTAS-COALSUD` (ref `menktqlsgtqooneyhalw`) tiene todas las migraciones, la Edge Function `admin-usuarios` y los usuarios definitivos (⚙ DT-41). Las credenciales están en `../CREDENCIALES.md` (fuera de git). Con las variables exportadas:

```bash
export SUPABASE_DB_URL='<pooler de sesión>'          # de CREDENCIALES.md
npx supabase db push --db-url "$SUPABASE_DB_URL"    # migraciones pendientes
npm run db:test:remoto                               # pgTAP: cada archivo en una transacción con rollback
npm run db:concurrencia                              # RNF-02 (crea y borra una regional ZQC aislada)
npm run db:rendimiento                               # RNF-01/03 (volumen en una transacción con rollback)
npm run db:datos-prueba                              # operación de prueba de 35 días para usar las pantallas (⚙ DT-43)
npm run db:datos-prueba:limpiar                      # la borra y deja datos base + seeds
SUPABASE_PROJECT_REF=menktqlsgtqooneyhalw SUPABASE_ACCESS_TOKEN='<token>' npm run types
```

Nunca contra prod.

## Levantar en local

```bash
npm install
npm run db:start     # primera vez: descarga las imágenes de Docker
```

| SERVICIO | URL |
|---|---|
| API (lo que usa el frontend) | http://127.0.0.1:54321 |
| Studio (panel) | http://127.0.0.1:54323 |
| Mailpit (correos de Auth) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

`npm run db:status` vuelve a mostrar las URL y las claves. `npm run db:stop` apaga los contenedores sin borrar datos.

Las Edge Functions quedan servidas en `/functions/v1/<nombre>`. Una función **nueva** aparece recién al reiniciar (`db:stop` + `db:start`); para editar con recarga en caliente, `npm run fn:serve`.

Usuarios de prueba (contraseña `Prueba123!`): `irene@coalsud.demo` e `ingeniero@coalsud.demo` (nacional), `vanessa@coalsud.demo` (LP + CBBA), `fernando@coalsud.demo` (SCZ).

Para conectar el frontend al backend local, en `frontend/.env`:

```
VITE_MODO_DATOS=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<clave publishable/anon de db:status>
```

## Scripts

Ver [Estructura del Backend §3](docs/04-ejecucion/Estructura_Backend.md). Los más usados:

| SCRIPT | QUÉ HACE |
|---|---|
| `db:reset` | recrea la base local: migraciones (con los datos base reales) + `seeds/*.sql` (datos de prueba) |
| `db:test` | corre las pruebas pgTAP |
| `db:push` | aplica las migraciones al proyecto vinculado (dev/prod) |
| `types` | regenera `../frontend/src/types/database.ts` desde la base local, o del proyecto remoto con `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` (se commitea en el mismo PR que la migración) |
| `db:test:remoto` | pgTAP contra dev sin Docker (`SUPABASE_DB_URL`) |
| `db:concurrencia` / `db:rendimiento` | pruebas de concurrencia y de volumen contra dev, sin dejar datos |

## Flujo de trabajo y despliegue

- Flujo: [Estructura del Backend §4](docs/04-ejecucion/Estructura_Backend.md).
- Despliegue a `dev` / `prod`: [Entornos y Despliegue §4](docs/04-ejecucion/Entornos_y_Despliegue.md).
