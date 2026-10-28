ESENCIAL CONSULTORA · DISEÑO DEL SISTEMA

# Seguridad de los Datos · Row Level Security — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Define **quién puede hacer qué** sobre cada dato y **dónde** se hace cumplir esa regla. No describe las pantallas (eso está en los Casos de Uso), sino la última línea de defensa: la que sigue en pie aunque alguien no use las pantallas.

El SQL definitivo vive en las migraciones (`backend/supabase/migrations/`). Aquí se documentan el diseño y la política de referencia de cada tabla.

**● Cambios v1.1:**
- Las tablas transaccionales pasan a **solo lectura** para el cliente (toda escritura por RPC, ⚙ DT-03).
- El nacional escribe maestros, configuración y presupuesto (⚠ SUP-31).
- Las funciones de contexto exigen un usuario **activo**.
- Se agregan la política completa por tabla (§4), Storage con SQL (§7), la Edge Function (§6) y la matriz de permisos completa (§10).

---

## 1 · Por qué hace falta

La app React tiene una matriz de permisos que decide qué botones y pantallas se muestran. Eso hace la interfaz usable, pero vive en el navegador: cualquiera que arme una consulta a mano con la clave pública (`anon`) y su sesión podría saltársela. **La seguridad real tiene que estar en la base.**

```
NAVEGADOR DE LA REGIONAL        consulta normal
  App React ─────────────────────────────► Supabase (Postgres)
  matriz de permisos                         RLS: solo devuelve las
  Consulta armada a mano ───────── RLS ────► filas que ese usuario puede ver
                                   RPC: valida rol/regional/día antes de escribir
```

| DÓNDE CORRE | MATRIZ EN REACT | RLS + RPC (BASE DE DATOS) |
|---|---|---|
| Qué logra | Que la pantalla sea usable | Que el dato sea inaccesible |
| ¿Se puede saltar? | Sí | No |
| Si falla | Se ve un botón de más | Se filtra información de otra regional |

---

## 2 · Los dos roles

| ROL | ALCANCE | PUEDE |
|---|---|---|
| **Nacional** (Irene, ingeniero) | Todas las regionales | Lee todo · ve EECC y auditoría · ● administra usuarios, catálogo, configuración y presupuesto · **reabre días** · **no** escribe datos transaccionales (⚠ SUP-31) |
| **Regional** (Vanessa = LP + CBBA, Fernando = SCZ) | Sus regionales | CRUD completo dentro de sus regionales (clientes, vendedores, inventario, notas, cobranzas, devoluciones, presupuesto); cierra el día |

El nacional no se ata a una regional (ve todas). El regional opera solo lo de sus regionales; puede tener varias, vía `usuario_regional`.

---

## 3 · Cómo se escriben las reglas

### 3.1 — Funciones de contexto (esquema `app`, `stable`, `security definer`, `search_path = ''`)
| FUNCIÓN | DEVUELVE |
|---|---|
| `app.usuario_activo()` ● | `true` si `auth.uid()` tiene fila en `usuario` con `activo = true` |
| `app.is_nacional()` | Usuario activo con rol `nacional` |
| `app.mis_regionales()` | `setof uuid`: todas las regionales si es nacional; las de `usuario_regional` si es regional |
| `app.puede_leer_regional(r uuid)` | Usuario activo y (nacional o `r ∈ mis_regionales()`) |
| `app.puede_escribir_regional(r uuid)` | Usuario activo, rol **regional** y `r ∈ mis_regionales()` |

```sql
create or replace function app.puede_escribir_regional(r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.usuario u
    join public.usuario_regional ur on ur.usuario_id = u.id
    where u.id = auth.uid() and u.activo and u.rol = 'regional' and ur.regional_id = r
  );
$$;
```

> En las políticas se escriben como `(select app.is_nacional())`, envueltas en `select`, para que Postgres las evalúe **una vez por consulta** y no una vez por fila.
>
> **Implementación (BE-06, `…_rls.sql`):**
> - Las lecturas por regional usan `regional_id in (select app.mis_regionales())`. Equivale a `puede_leer_regional(regional_id)`, pero el conjunto se calcula una vez por consulta: con un argumento de la fila, `(select f(col))` igual se evalúa por fila.
> - Las hijas (`*_item`, `liquidacion_linea`) usan `exists (select 1 from <padre> where id = <fk>)`, y la RLS del padre filtra. Así el ítem de un traspaso también lo ve la regional destino.
> - `usuario` usa `app.comparte_regional(id)` (security definer): con la RLS de `usuario_regional`, un regional no vería las filas de sus compañeros.
> - Las políticas corren como `authenticated`: se le da `usage` sobre `app` y `execute` solo sobre las funciones de contexto (y `carpeta_regional`, para Storage). Toda migración que cree funciones en `app` termina con `revoke execute on all functions in schema app from public`.
> - Storage usa `app.carpeta_regional(name)`, que devuelve null si la primera carpeta no es un uuid, en lugar de fallar con un error de cast.

### 3.2 — Los cinco patrones
| PATRÓN | APLICA A | SELECT | INSERT / UPDATE | DELETE |
|---|---|---|---|---|
| **A · Maestro nacional** | `linea_comercial`, `producto`, `condicion_pago`, `regional`, `almacen` | autenticado activo | solo nacional | nadie (se desactiva) |
| **B · Maestro regional** ● | `cliente`, `vendedor`, `presupuesto` | `puede_leer_regional` | `puede_escribir_regional` (presupuesto: también nacional) | nadie |
| **C · Transaccional por regional** ● | `nota_venta`, `nota_venta_item`, `documento_inventario`, `documento_inventario_item`, `movimiento_inventario`, `stock_saldo`, `devolucion`, `devolucion_item`, `cobranza`, `cxc_saldo_inicial`, `liquidacion`, `liquidacion_linea` | `puede_leer_regional` (los hijos, por la regional del padre) | **sin política** → solo las RPC | nadie |
| **D · Reservado a un rol** | `auditoria` (lectura), RPC de reabrir, EECC, cartera inicial | solo nacional | — | — |
| **E · Solo agregado** | `auditoria`, `correlativo` | (ver D) | solo triggers/RPC internas | nadie |

```sql
-- Patrón C (nota_venta): todos leen lo suyo; nadie escribe directo
alter table public.nota_venta enable row level security;
create policy nv_select on public.nota_venta
  for select to authenticated
  using ( (select app.puede_leer_regional(regional_id)) );
-- sin políticas de INSERT/UPDATE/DELETE: la escritura va por public.emitir_nota_venta(...)

-- Patrón C, tabla hija (nota_venta_item): permiso heredado del padre
create policy nvi_select on public.nota_venta_item
  for select to authenticated
  using ( exists (select 1 from public.nota_venta n
                  where n.id = nota_venta_id
                    and (select app.puede_leer_regional(n.regional_id))) );

-- Patrón B (cliente)
alter table public.cliente enable row level security;
create policy cli_select on public.cliente for select to authenticated
  using ( (select app.puede_leer_regional(regional_id)) );
create policy cli_insert on public.cliente for insert to authenticated
  with check ( (select app.puede_escribir_regional(regional_id)) );
create policy cli_update on public.cliente for update to authenticated
  using ( (select app.puede_escribir_regional(regional_id)) )
  with check ( (select app.puede_escribir_regional(regional_id)) );

-- Patrón A (producto)
create policy prod_select on public.producto for select to authenticated
  using ( (select app.usuario_activo()) );
create policy prod_write on public.producto for all to authenticated
  using ( (select app.is_nacional()) ) with check ( (select app.is_nacional()) );
```

### 3.3 — Grants
- `anon`: **ningún** privilegio sobre tablas, vistas ni RPC del esquema `public` (solo existe para el login).
- `authenticated`:
  - `select` en todas las tablas y vistas expuestas;
  - `insert, update` solo en las tablas de patrones A y B;
  - `execute` en las RPC públicas.
- El esquema `app`: `usage` revocado a `anon` y `authenticated` (salvo lo que necesitan las políticas, que corre como `security definer`).
- Las vistas se crean con `security_invoker = true`, para que respeten la RLS de las tablas base.

---

## 4 · Política por tabla (referencia)

| TABLA | SELECT | INSERT | UPDATE | DELETE | NOTA |
|---|---|---|---|---|---|
| regional | activo | nacional | nacional | — | prefijo no editable con documentos (trigger) |
| usuario | propio · nacional (todos) · regional (solo los de sus regionales, para nombres) | Edge Fn | Edge Fn (+ RPC `marcar_password_cambiado` para el propio) | — | |
| usuario_regional | propio · nacional | Edge Fn | Edge Fn | Edge Fn | |
| vendedor | leer_regional | escribir_regional | escribir_regional | — | |
| almacen | activo | nacional | nacional | — | |
| linea_comercial · producto · condicion_pago | activo | nacional | nacional | — | ⚠ SUP-02 |
| cliente | leer_regional | escribir_regional | escribir_regional | — | trigger: vendedor de la misma regional |
| presupuesto | leer_regional | escribir_regional **o** nacional | ídem | — | ⚠ SUP-33 |
| documento_inventario (+item) | leer_regional (origen **o** destino si es traspaso) | RPC | — | — | |
| movimiento_inventario | leer_regional | RPC | — | — | |
| stock_saldo | leer_regional | trigger | trigger | — | |
| nota_venta (+item) | leer_regional | RPC | RPC (anular, factura) | — | |
| devolucion (+item) | leer_regional | RPC | RPC (N° NC contable) | — | |
| cobranza | leer_regional | RPC | RPC (anular) | — | |
| cxc_saldo_inicial | leer_regional | RPC nacional | — | — | |
| liquidacion (+linea) | leer_regional | RPC | RPC | RPC (líneas, al reabrir) | |
| auditoria | **nacional** | trigger/RPC | — | — | solo se agrega |
| correlativo | — (nadie) | RPC | RPC | — | |

Toda tabla del esquema `public` tiene `enable row level security`. Una tabla sin política no devuelve nada (default deny).

---

## 5 · Lo que la RLS no puede hacer sola

Algunas reglas no son de fila, sino de **transición**. Se hacen cumplir con **RPC** y **triggers**:

| REGLA | MECANISMO |
|---|---|
| El stock solo cambia por `movimiento_inventario` | Sin permisos de escritura sobre `stock_saldo`; trigger `app.tg_mov_actualiza_saldo` |
| Stock nunca negativo (ni en almacén ni en vendedor), sin sobreventa concurrente | `CHECK (cantidad >= 0)` + `SELECT … FOR UPDATE` en la RPC |
| Un traspaso genera exactamente dos movimientos | Solo lo crea `registrar_traspaso` |
| No se crea ni edita nada de un **día cerrado** (RF33) | `app.asegurar_dia_abierto()` en cada RPC + trigger `app.tg_bloqueo_dia` en las tablas transaccionales (defensa en profundidad) |
| No hay fechas futuras ni anteriores al último cierre | `app.asegurar_dia_abierto()` |
| La anulación repone stock; la devolución egresa de la caja o abona | Lógica de la RPC |
| Numeración por regional sin huecos | `app.siguiente_numero()` con bloqueo de fila sobre `correlativo` |
| Siempre queda al menos un nacional activo | Trigger sobre `usuario` |
| Una nota emitida no se edita (salvo anular y factura) | Trigger `app.tg_nota_inmutable`: solo admite cambios en las columnas de anulación y factura, y solo desde las RPC |
| Vendedor y cliente de la misma regional | Trigger sobre `cliente` y validación en `emitir_nota_venta` |

Cada RPC `security definer`:
1. empieza validando `app.puede_escribir_regional(p_regional_id)` (o `app.is_nacional()`);
2. fija `set search_path = ''` y usa nombres calificados (`public.tabla`);
3. nunca confía en un `regional_id` que no haya verificado contra la fila real (por ejemplo, la regional de la nota se lee de la nota, no del parámetro).

---

## 6 · ● Administración de usuarios (Edge Function)

Crear una cuenta en `auth.users` requiere la clave `service_role`, que **no puede estar en el navegador**. Por eso existe la Edge Function `admin-usuarios`:
1. Lee el JWT del header `Authorization` y lo valida con `auth.getUser(jwt)`, que devuelve el `uid` del llamador.
2. Con un cliente `service_role` (variable secreta de la función), verifica que `public.usuario` tenga ese `uid` con `rol = 'nacional'` y `activo = true`. Si no, responde 403 `SOLO_NACIONAL`.
3. Ejecuta la acción pedida sobre `auth.users`, `usuario` y `usuario_regional`.
4. Escribe la auditoría (`crear_usuario`, `editar_usuario`, `desactivar_usuario`, `reactivar_usuario`, `resetear_password`) con el id del llamador.

**Implementación (BE-07):**
- La parte de la base (perfil, regionales y auditoría) va en RPC transaccionales `admin_*`, que solo puede ejecutar `service_role`. El rol y las regionales se validan ahí, una sola vez.
- En un alta, si la RPC falla, la función borra la cuenta de auth recién creada (compensación).
- El JWT lo valida la propia función, con `verify_jwt = false` en `config.toml`.

Signups públicos **deshabilitados** en el panel de Auth. Confirmación de correo deshabilitada: las cuentas se crean ya confirmadas (⚠ SUP-30).

---

## 7 · Storage (PDF de facturas)

- Bucket **privado** `facturas`, con `file_size_limit = 10 MB` y `allowed_mime_types = ['application/pdf']`.
- Ruta: `{regional_id}/{nota_venta_id}.pdf`. Se usa el id y no el número, para no depender de caracteres especiales.
- Las descargas se hacen con **URL firmadas** de corta duración (60 s), nunca públicas.

```sql
create policy fact_read on storage.objects for select to authenticated
  using ( bucket_id = 'facturas'
          and (select app.puede_leer_regional(((storage.foldername(name))[1])::uuid)) );
create policy fact_insert on storage.objects for insert to authenticated
  with check ( bucket_id = 'facturas'
          and (select app.puede_escribir_regional(((storage.foldername(name))[1])::uuid)) );
create policy fact_update on storage.objects for update to authenticated
  using ( bucket_id = 'facturas'
          and (select app.puede_escribir_regional(((storage.foldername(name))[1])::uuid)) );
-- sin DELETE: reemplazar = subir con upsert; la ruta guardada en la nota la fija registrar_factura_nota
```

Subir un PDF se permite **aunque el día esté cerrado** (⚠ SUP-06).

---

## 8 · Las tres capas de registro

| CAPA | QUÉ GUARDA | DÓNDE VIVE |
|---|---|---|
| Movimientos | El dato mismo (notas, cobranzas, movimientos de stock) | Tablas del sistema |
| Auditoría | Quién cambió qué, cuándo y por qué | `auditoria` (solo se agrega) |
| Log técnico | Errores, llamadas a la API | Fuera del modelo (logs de Supabase) |

**Por qué la auditoría propia sigue haciendo falta.** Los logs de Supabase cuentan accesos técnicos, no decisiones de negocio. Para la rendición de cuentas (quién anuló una nota, quién cerró o reabrió un día, quién cambió un precio) se usa la tabla `auditoria`.

**Acciones auditadas** (`auditoria.accion`):
- notas: `emitir_nota`, `anular_nota`, `registrar_factura`, `cambio_precio`, `descuento`;
- devoluciones y cobranzas: `registrar_devolucion`, `registrar_cobranza`, `anular_cobranza`, `cargar_cartera_inicial`;
- inventario: `registrar_ingreso`, `registrar_salida`, `registrar_retorno`, `registrar_traspaso`, `registrar_ajuste`;
- liquidación: `cerrar_dia`, `reabrir_dia`;
- maestros: `crear` / `editar` / `desactivar` / `reactivar` / `cambio_precio_base` (por trigger, `tg_auditar_maestro`);
- usuarios: `crear_usuario`, `editar_usuario`, `desactivar_usuario`, `resetear_password`.

---

## 9 · Verificación

| # | PRUEBA | ESPERADO |
|---|---|---|
| 1 | Fernando (SCZ) consulta notas de La Paz | No ve datos de otra regional |
| 2 | El admin nacional llama a `emitir_nota_venta` | Rechazado (NO_AUTORIZADO): el nacional no escribe datos transaccionales |
| 3 | Intentar editar un registro de auditoría | Rechazado: solo se agrega |
| 4 | Crear una nota de un día cerrado | Rechazado (DIA_CERRADO) |
| 5 | Editar el saldo de stock a mano | Rechazado: no hay permiso de escritura |
| 6 | Un regional intenta reabrir un día | Rechazado (SOLO_NACIONAL) |
| 7 ● | `insert` directo en `nota_venta` con la sesión de Vanessa | Rechazado (sin política de INSERT) |
| 8 ● | Usuario desactivado con un JWT todavía válido lee clientes | 0 filas (`usuario_activo()` = false) |
| 9 ● | Vanessa pide la URL firmada de un PDF de SCZ | Rechazado por la política de Storage |
| 10 ● | Un regional invoca `admin-usuarios` | 403 SOLO_NACIONAL |

La batería completa se corre con pgTAP (`supabase test db`, archivo `tests/10_rls.test.sql`), no a mano. Debe dar: **todas las tablas de `public` con RLS activa, ninguna tabla sin al menos una política de SELECT y ninguna política de escritura sobre las tablas del patrón C**.

---

## 10 · Checklist de puesta en producción

- [ ] RLS activa en **todas** las tablas de `public` (default deny).
- [ ] `service_role` solo en los secretos de la Edge Function y en la CLI de migración; **nunca** en el frontend ni en el repo.
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en `.env`, fuera del control de versiones.
- [ ] Signups públicos **deshabilitados** en Supabase Auth.
- [ ] Operaciones críticas vía RPC `security definer` con guarda de rol y regional, y `search_path = ''`.
- [ ] Triggers de bloqueo de día cerrado activos en notas, cobranzas, devoluciones y movimientos.
- [ ] Validación de entradas en el cliente **y** en la base.
- [ ] Bucket de facturas privado, con límite de tamaño, tipo MIME y políticas por regional.
- [ ] `anon` sin privilegios sobre `public`; esquema `app` no expuesto en la configuración de la API.
- [ ] `supabase test db` en verde (incluye `rls.test.sql`).
- [ ] Backups diarios activos (plan Pro, ⚠ SUP-40).

---

## 11 · Matriz de permisos (resumen)

| ACCIÓN | Regional (su regional) | Regional (otra) | Nacional |
|---|---|---|---|
| Ver clientes / productos / notas / stock | ✅ | ❌ | ✅ (todo) |
| Crear/editar clientes y vendedores | ✅ | ❌ | ❌ |
| Mantener catálogo, condiciones de pago, regionales y almacenes | ❌ (⚠ SUP-02) | ❌ | ✅ |
| Ingreso, salida, retorno, ajuste | ✅ | ❌ | ❌ |
| Traspaso (desde su regional hacia otra) | ✅ | ❌ (no puede originar) | ❌ |
| Crear/anular nota de venta | ✅ | ❌ | ❌ |
| Registrar N° de factura / PDF | ✅ | ❌ | ❌ |
| Registrar devolución | ✅ | ❌ | ❌ |
| Registrar/anular cobranza | ✅ | ❌ | ❌ |
| Cargar cartera inicial | ❌ | ❌ | ✅ |
| Ver reporte diario | ✅ | ❌ | ✅ |
| Cerrar el día | ✅ | ❌ | ❌ |
| Reabrir día cerrado (último) | ❌ | ❌ | ✅ |
| Cargar presupuesto | ✅ | ❌ | ✅ |
| Ver EECC consolidado | ❌ | ❌ | ✅ |
| Ver auditoría | ❌ | ❌ | ✅ |
| Administrar usuarios | ❌ | ❌ | ✅ |
