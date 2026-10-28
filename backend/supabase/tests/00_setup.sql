-- Helpers de prueba (Estrategia de Pruebas §2). Corre primero (orden alfabético) y queda en la base
-- local para los demás archivos. NO es una migración: nunca llega a dev/prod; db reset lo borra.
begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Búsquedas por clave natural (definer: funcionan aunque la RLS del usuario impersonado las oculte).
create or replace function tests.id_de(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where u.email = p_email;
$$;

create or replace function tests.regional(p_codigo text) returns uuid
language sql stable security definer set search_path = '' as $$
  select r.id from public.regional r where r.codigo = p_codigo;
$$;

create or replace function tests.almacen(p_codigo_regional text) returns uuid
language sql stable security definer set search_path = '' as $$
  select a.id from public.almacen a join public.regional r on r.id = a.regional_id
  where r.codigo = p_codigo_regional order by a.created_at limit 1;
$$;

create or replace function tests.vendedor(p_nombre text) returns uuid
language sql stable security definer set search_path = '' as $$
  select v.id from public.vendedor v where v.nombre = p_nombre;
$$;

create or replace function tests.producto(p_nombre text) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.producto p where p.nombre = p_nombre;
$$;

-- p_items de un solo producto, como los manda el frontend: [{producto_id, cantidad}].
create or replace function tests.items(p_nombre text, p_cantidad numeric) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_array(jsonb_build_object('producto_id', tests.producto(p_nombre), 'cantidad', p_cantidad));
$$;

-- Saldo de una ubicación (vendedor nulo = stock físico del almacén), sin la RLS del usuario impersonado.
create or replace function tests.saldo(p_almacen uuid, p_vendedor uuid, p_producto text) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(s.cantidad), 0) from public.stock_saldo s
  where s.almacen_id = p_almacen and s.vendedor_id is not distinct from p_vendedor and s.producto_id = tests.producto(p_producto);
$$;

create or replace function tests.cliente(p_nombre text) returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.cliente c where c.nombre = p_nombre;
$$;

create or replace function tests.condicion(p_nombre text) returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.condicion_pago c where c.nombre = p_nombre;
$$;

-- Ítem de nota como lo manda el frontend: {producto_id, cantidad, precio_aplicado}.
create or replace function tests.item_nota(p_producto text, p_cantidad numeric, p_precio numeric) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('producto_id', tests.producto(p_producto), 'cantidad', p_cantidad, 'precio_aplicado', p_precio);
$$;

-- emitir_nota_venta por nombres. Corre con el rol impersonado (no es definer): los permisos se prueban de verdad.
create or replace function tests.emitir(
  p_regional text, p_cliente text, p_vendedor text, p_items jsonb,
  p_descuento numeric default 0, p_origen text default 'almacen', p_fecha date default null,
  p_condicion text default null, p_canal text default null
) returns jsonb language sql as $$
  select public.emitir_nota_venta(
    tests.regional(p_regional), coalesce(p_fecha, public.hoy()), tests.cliente(p_cliente), tests.vendedor(p_vendedor),
    p_canal, tests.condicion(p_condicion), p_descuento, p_origen, null, null, p_items);
$$;

-- Impersonación, como lo hace PostgREST con el JWT. No pueden ser security definer (cambian role).
create or replace function tests.como(p_email text) returns void language plpgsql as $$
declare v_id uuid := tests.id_de(p_email);
begin
  if v_id is null then
    raise exception 'tests.como: no existe el usuario %', p_email;
  end if;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create or replace function tests.como_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;

-- Como la Edge Function (service_role: salta la RLS, ejecuta las RPC admin_*).
create or replace function tests.como_servicio() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
end $$;

create or replace function tests.como_postgres() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Código de error de una sentencia: el código de negocio (hint de un P0001, Contrato §2) o el SQLSTATE;
-- null si no falló. Solo P0001: desde PG17 los errores de permiso también traen un hint (texto).
create or replace function tests.codigo_error(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return case when v_estado = 'P0001' and v_hint <> '' then v_hint else v_estado end;
end $$;

-- detail de un error de negocio (los datos para la UI, Contrato §2) como jsonb; null si no falló.
create or replace function tests.detalle_error(p_sql text) returns jsonb language plpgsql as $$
declare v_detalle text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_detalle = pg_exception_detail;
  return nullif(v_detalle, '')::jsonb;
end $$;

-- Filas afectadas por un insert/update/delete: la RLS filtra sin error (0 filas).
create or replace function tests.filas(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

-- Datos base ------------------------------------------------------------------------------

-- Base vacía para el archivo de prueba, sin importar migraciones de datos ni seeds: cada archivo
-- arma sus datos. Corre dentro de su transacción, así que el rollback final deja todo como estaba.
create or replace function tests.vaciar() returns void language plpgsql as $$
begin
  execute (select 'truncate ' || string_agg(format('public.%I', tablename), ', ') || ' cascade' from pg_tables where schemaname = 'public');
  delete from auth.users;
end $$;

-- Las tres regionales con su almacén (Datos Iniciales §1.1).
create or replace function tests.crear_regionales() returns void language sql as $$
  insert into public.regional (codigo, nombre) values ('LP', 'La Paz'), ('CBBA', 'Cochabamba'), ('SCZ', 'Santa Cruz');
  insert into public.almacen (regional_id, nombre) select r.id, 'Almacén ' || r.nombre from public.regional r;
$$;

-- Usuario completo: auth.users + usuario + usuario_regional (por código de regional).
create or replace function tests.crear_usuario(
  p_email text, p_rol text, p_regionales text[] default '{}', p_activo boolean default true
) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_id, p_email);
  insert into public.usuario (id, nombre, email, rol, activo, debe_cambiar_password)
  values (v_id, initcap(split_part(p_email, '@', 1)), p_email, p_rol, p_activo, false);
  insert into public.usuario_regional (usuario_id, regional_id)
  select v_id, r.id from public.regional r where r.codigo = any (p_regionales);
  return v_id;
end $$;

select plan(1);
select has_schema('tests', 'Helpers de prueba listos');
select * from finish();
commit;
