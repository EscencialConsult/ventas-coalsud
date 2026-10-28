ESENCIAL CONSULTORA · EJECUCIÓN DEL PROYECTO

# Entornos y Despliegue — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

---

## 1 · Entornos

| ENTORNO | BACKEND | FRONTEND | DATOS | QUIÉN |
|---|---|---|---|---|
| **local** | `supabase start` (Docker): API `http://127.0.0.1:54321`, Studio `:54323`, DB `:54322` | `npm run dev` (Vite, `:5173`) datos base (migración) + `seeds/*.sql` | cada desarrollador |
| **dev** | ● Proyecto Supabase **`VENTAS-COALSUD`** (ref `menktqlsgtqooneyhalw`, **us-east-1**, ⚙ DT-30): todas las migraciones aplicadas y la Edge Function desplegada. Se usa sin Docker | Deploy preview de Netlify por PR | datos base + seeds de prueba (los 4 usuarios definitivos, ⚙ DT-41) | equipo y validación con el cliente |
| **prod** | Proyecto Supabase `coalsud-prod` (**Pro**, sa-east-1, ⚠ SUP-40). ● Todavía no creado | Netlify producción (⚙ DT-18; dominio a definir, p. ej. `comercial.coalsud.com.bo`) | datos reales | regionales y nacional |

> En `prod` nunca se corren seeds de prueba ni usuarios `@coalsud.demo`.

---

## 2 · Variables y secretos

| VARIABLE | DÓNDE | VALOR | SECRETO |
|---|---|---|---|
| `VITE_SUPABASE_URL` | frontend `.env` / variables de entorno de Netlify | URL del proyecto | no |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env` / variables de entorno de Netlify | clave `anon` | no (es pública; la protección es la RLS) |
| `VITE_MODO_DATOS` | Netlify: `supabase` en todos los contextos | ⚙ DT-17 | no |
| `VITE_INACTIVIDAD_MIN` | frontend | `30` (⚠ SUP-38) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | secretos de la Edge Function (`supabase secrets set`) y `.env` local de quien carga datos | clave `service_role` | **sí — nunca en el repo ni en el frontend** |
| `SUPABASE_DB_PASSWORD` | CLI de quien migra | contraseña de la base | **sí** |
| `SUPABASE_PROJECT_REF` | `.env` del backend | ref de dev o prod | no |

`.env` está en `.gitignore`. El repo tiene `.env.example`, con las claves vacías.

---

## 3 · Configuración de Supabase (cada proyecto)

| ÁREA | AJUSTE |
|---|---|
| Auth → Providers | Solo Email. **Signups deshabilitados**. **Confirm email: off** (las cuentas las crea el nacional) |
| Auth → Política de contraseñas | Mínimo 8 caracteres |
| Auth → Sesiones | JWT de 3600 s con refresh token; el cierre por inactividad lo hace el frontend (30 min) |
| Auth → URL | Site URL = dominio del frontend (para el entorno) |
| API → Exposed schemas | **solo `public`** (`app` no se expone) |
| API → Max rows | 1000 (los listados paginan de a 50) |
| Database → Timezone | Se deja en UTC; las fechas de negocio salen de `app.hoy()` (America/La_Paz) |
| Storage | Bucket `facturas` (privado, 10 MB, `application/pdf`), creado por migración |
| Backups (prod) | Diarios (plan Pro, 7 días de retención); evaluar PITR si el cliente lo requiere |

● **Estado de `VENTAS-COALSUD` (28/10/2026).** Cumplen: Exposed schemas sin `app`, Max rows 1000, JWT de 3600 s, bucket `facturas`. **Pendiente de ajustar en el panel** (Authentication → Sign In / Providers y Policies; API → Settings): `Allow new users to sign up` = off, `Confirm email` = off, mínimo de contraseña 8 (hoy 6), Exposed schemas solo `public` (hoy también `graphql_public`) y Site URL = dominio del frontend cuando exista (hoy `http://localhost:3000`). Mientras tanto, una cuenta creada por signup no ve datos (sin fila en `usuario`, `mi_perfil` → `NO_AUTORIZADO`).

---

## 4 · Despliegue del backend

```bash
# una vez por máquina
supabase login
supabase link --project-ref <ref-dev>        # o <ref-prod>

# cada release
supabase db push                              # aplica las migraciones pendientes
#   sin link/Docker (⚙ DT-30): npx supabase db push --db-url "$SUPABASE_DB_URL"
supabase functions deploy admin-usuarios
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=…   # solo la primera vez o al rotar
npm run types                                 # si cambió el esquema
```

**Orden obligatorio:** `dev` → validar → `prod`. En `prod`:
- se despliega fuera del horario operativo (después del cierre del día de las tres regionales);
- se toma un backup manual antes de cada migración que altere tablas con datos.

---

## 5 · Despliegue del frontend

- Netlify conectado al monorepo con **Base directory `frontend`** (⚙ DT-12, DT-18; `netlify.toml` en la raíz del repo):
  - cada PR genera un *deploy preview* contra `dev`;
  - `main` despliega a producción contra `prod`.
- Build command `npm run build`, publish directory `dist`.
- Rewrite SPA con `public/_redirects`: `/*    /index.html   200`, el mismo archivo de la referencia.
- Las variables de entorno se cargan por contexto (production / deploy-preview) en el panel de Netlify.
- Build: `npm run build` (incluye `tsc --noEmit` y `oxlint`).

---

## 6 · Integración continua (⚙ propuesta)

| REPO | JOB | PASOS |
|---|---|---|
| backend | `test-db` | checkout → `supabase start` → `supabase db reset` → `supabase test db` |
| frontend | `build` | `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` |
| frontend | `e2e` (nightly o manual) | levanta el backend local con seeds → `npx playwright test` |

---

## 7 · Checklist de release a producción

- [ ] `supabase test db` en verde en dev.
- [ ] Checklist de [Seguridad RLS §10](../02-diseno/Seguridad_RLS.md) completo.
- [ ] Tipos del frontend regenerados y commiteados.
- [ ] Backup manual tomado (si hay migración con datos).
- [ ] Ninguna regional con el día en curso sin cerrar durante la ventana, o aviso previo a los usuarios.
- [ ] Smoke test en prod: login de un usuario por rol, apertura del reporte del día, impresión de una nota de prueba (luego se anula).
