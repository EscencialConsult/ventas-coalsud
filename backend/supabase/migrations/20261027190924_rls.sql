-- RLS, políticas y grants (Seguridad RLS §3–4). Toda tabla de public tiene RLS: sin política, nada.
-- Lectura por regional: `regional_id in (select app.mis_regionales())` equivale a puede_leer_regional,
-- pero el conjunto se calcula una vez por consulta y no una vez por fila.

-- Helpers de políticas ---------------------------------------------------------------------

-- ¿El usuario p comparte alguna regional con el de la sesión? (nombres de compañeros, §4)
create function app.comparte_regional(p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuario_regional ur
    where ur.usuario_id = p_usuario and ur.regional_id in (select app.mis_regionales())
  );
$$;

revoke execute on all functions in schema app from public;

-- Las políticas corren como authenticated: necesitan ver app y ejecutar sus funciones de contexto.
grant usage on schema app to authenticated;
grant execute on function
  app.usuario_activo(), app.is_nacional(), app.mis_regionales(),
  app.puede_leer_regional(uuid), app.puede_escribir_regional(uuid), app.comparte_regional(uuid)
  to authenticated;

-- RLS en todas las tablas ------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- A · Maestro nacional: lo lee todo usuario activo; lo escribe el nacional; no se borra (se desactiva).
do $$
declare t text;
begin
  foreach t in array array['regional', 'almacen', 'linea_comercial', 'producto', 'condicion_pago'] loop
    execute format('create policy a_select on public.%I for select to authenticated using ((select app.usuario_activo()))', t);
    execute format('create policy a_insert on public.%I for insert to authenticated with check ((select app.is_nacional()))', t);
    execute format('create policy a_update on public.%I for update to authenticated using ((select app.is_nacional())) with check ((select app.is_nacional()))', t);
  end loop;
end $$;

-- B · Maestro regional: lo lee quien ve la regional; lo escribe el regional de esa regional.
do $$
declare t text;
begin
  foreach t in array array['cliente', 'vendedor'] loop
    execute format('create policy b_select on public.%I for select to authenticated using (regional_id in (select app.mis_regionales()))', t);
    execute format('create policy b_insert on public.%I for insert to authenticated with check (app.puede_escribir_regional(regional_id))', t);
    execute format('create policy b_update on public.%I for update to authenticated using (app.puede_escribir_regional(regional_id)) with check (app.puede_escribir_regional(regional_id))', t);
  end loop;
end $$;

-- presupuesto: además lo carga el nacional (⚠ SUP-33).
create policy b_select on public.presupuesto for select to authenticated
  using (regional_id in (select app.mis_regionales()));
create policy b_insert on public.presupuesto for insert to authenticated
  with check (app.puede_escribir_regional(regional_id) or (select app.is_nacional()));
create policy b_update on public.presupuesto for update to authenticated
  using (app.puede_escribir_regional(regional_id) or (select app.is_nacional()))
  with check (app.puede_escribir_regional(regional_id) or (select app.is_nacional()));

-- C · Transaccional: solo lectura; la escritura va por RPC security definer (sin políticas de escritura).
do $$
declare t text;
begin
  foreach t in array array['nota_venta', 'movimiento_inventario', 'stock_saldo', 'devolucion', 'cobranza', 'cxc_saldo_inicial', 'liquidacion'] loop
    execute format('create policy c_select on public.%I for select to authenticated using (regional_id in (select app.mis_regionales()))', t);
  end loop;
end $$;

-- documento_inventario: la regional destino también ve los traspasos que recibe.
create policy c_select on public.documento_inventario for select to authenticated
  using (
    regional_id in (select app.mis_regionales())
    or almacen_destino_id in (select a.id from public.almacen a where a.regional_id in (select app.mis_regionales()))
  );

-- Hijas: visibles si el padre lo es (la RLS del padre filtra el exists).
create policy c_select on public.nota_venta_item for select to authenticated
  using (exists (select 1 from public.nota_venta n where n.id = nota_venta_id));
create policy c_select on public.documento_inventario_item for select to authenticated
  using (exists (select 1 from public.documento_inventario d where d.id = documento_id));
create policy c_select on public.devolucion_item for select to authenticated
  using (exists (select 1 from public.devolucion d where d.id = devolucion_id));
create policy c_select on public.liquidacion_linea for select to authenticated
  using (exists (select 1 from public.liquidacion l where l.id = liquidacion_id));

-- Usuarios: el propio, el nacional a todos, el regional a los de sus regionales (para nombres).
-- Altas y cambios: Edge Function admin-usuarios (service_role) y RPC marcar_password_cambiado.
create policy u_select on public.usuario for select to authenticated
  using (id = (select auth.uid()) or (select app.is_nacional()) or app.comparte_regional(id));
create policy u_select on public.usuario_regional for select to authenticated
  using (usuario_id = (select auth.uid()) or (select app.is_nacional()));

-- D/E · auditoria: la lee solo el nacional; se agrega por trigger/RPC. correlativo: nadie (sin política).
create policy d_select on public.auditoria for select to authenticated
  using ((select app.is_nacional()));

-- Grants -----------------------------------------------------------------------------------
-- anon: nada. authenticated: select en todo (la RLS filtra), insert/update solo en maestros (A y B).

revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
revoke select on public.correlativo from authenticated;
grant insert, update on
  public.regional, public.almacen, public.linea_comercial, public.producto, public.condicion_pago,
  public.cliente, public.vendedor, public.presupuesto
  to authenticated;
