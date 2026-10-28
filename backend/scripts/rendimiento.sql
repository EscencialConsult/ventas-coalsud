-- Prueba de rendimiento (Estrategia de Pruebas §6, RNF-01 y RNF-03) sobre la base dev, sin dejar datos:
-- todo corre en UNA transacción que termina en rollback. Usa las regionales, productos, vendedores y
-- usuarios ya cargados (seeds) y agrega ~36.000 notas (60 días × 200 por día y regional, 5 ítems cada una).
-- Uso: psql "$SUPABASE_DB_URL" -X -f scripts/rendimiento.sql   (npm run db:rendimiento)
\set ON_ERROR_STOP 1
\pset pager off
set client_min_messages = warning;
begin;
set local statement_timeout = 0;

-- Volumen ------------------------------------------------------------------------------------
create temporary table vol_usuario on commit drop as
  select id from public.usuario where rol = 'nacional' and activo order by created_at limit 1;

insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id, vendedor_id)
select r.id, format('VOLUMEN %s %s', r.codigo, n),
  (array['supermercado', 'mayorista', 'minorista', 'institucional'])[1 + n % 4],
  (array['supermercado', 'ruta', 'ruta', 'institucional'])[1 + n % 4],
  (select c.id from public.condicion_pago c where c.tipo = case when n % 2 = 0 then 'credito' else 'contado' end order by c.orden, c.nombre limit 1),
  (select v.id from public.vendedor v where v.regional_id = r.id order by v.nombre offset n % greatest((select count(*) from public.vendedor x where x.regional_id = r.id), 1) limit 1)
from public.regional r cross join generate_series(1, 100) n;

-- Ingreso inicial grande en el almacén principal de cada regional, 61 días atrás.
insert into public.documento_inventario (numero, tipo, regional_id, almacen_id, fecha, referencia, usuario_id)
select 'NI-VOL-' || r.codigo, 'ingreso', r.id, app.almacen_principal(r.id), app.hoy() - 61, 'volumen', (select id from vol_usuario)
from public.regional r;
insert into public.movimiento_inventario (fecha, tipo, regional_id, almacen_id, producto_id, cantidad, documento_id, usuario_id)
select d.fecha, 'ingreso', d.regional_id, d.almacen_id, p.id, 1000000, d.id, (select id from vol_usuario)
from public.documento_inventario d cross join public.producto p
where d.numero like 'NI-VOL-%' and p.activo;

create temporary table vol_nota on commit drop as
select gen_random_uuid() as id, r.id as regional_id, r.codigo, app.hoy() - dia as fecha, n,
  (select c.id from public.cliente c where c.regional_id = r.id and c.nombre = format('VOLUMEN %s %s', r.codigo, 1 + (dia * 7 + n) % 100)) as cliente_id
from public.regional r cross join generate_series(1, 60) dia cross join generate_series(1, 200) n;

insert into public.nota_venta (id, numero, regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, dias_credito,
                               descuento_pct, numero_factura, usuario_id)
select v.id, format('VOL-%s-%s', v.codigo, row_number() over (partition by v.regional_id order by v.fecha, v.n)), v.regional_id, v.fecha,
  c.id, c.vendedor_id, c.canal, c.condicion_pago_id, cp.tipo, cp.dias, case when v.n % 10 = 0 then 5 else 0 end,
  'F-VOL-' || v.n, (select id from vol_usuario)
from vol_nota v join public.cliente c on c.id = v.cliente_id join public.condicion_pago cp on cp.id = c.condicion_pago_id;

create temporary table vol_producto on commit drop as
  select id, precio_base, row_number() over (order by id) - 1 as k from public.producto where activo;

insert into public.nota_venta_item (nota_venta_id, producto_id, cantidad, precio_base, precio_aplicado)
select v.id, p.id, 1 + (v.n + i) % 9, p.precio_base, p.precio_base
from vol_nota v cross join generate_series(0, 4) i
join vol_producto p on p.k = (v.n * 5 + i) % (select count(*) from vol_producto);

insert into public.movimiento_inventario (fecha, tipo, regional_id, almacen_id, producto_id, cantidad, nota_venta_id, usuario_id)
select n.fecha, 'venta', n.regional_id, app.almacen_principal(n.regional_id), i.producto_id, -i.cantidad, n.id, (select id from vol_usuario)
from vol_nota v join public.nota_venta n on n.id = v.id join public.nota_venta_item i on i.nota_venta_id = n.id;

-- Un cobro parcial en un tercio de las notas a crédito.
insert into public.cobranza (numero, regional_id, fecha, nota_venta_id, forma_pago, importe, usuario_id)
select format('CB-VOL-%s-%s', n.regional_id, row_number() over ()), n.regional_id, least(n.fecha + 3, app.hoy()), n.id, 'efectivo', 10,
  (select id from vol_usuario)
from public.nota_venta n join vol_nota v on v.id = n.id
where n.condicion_tipo = 'credito' and v.n % 3 = 0;

analyze public.nota_venta, public.nota_venta_item, public.movimiento_inventario, public.cobranza, public.cliente, public.stock_saldo;
select (select count(*) from public.nota_venta) as notas, (select count(*) from public.nota_venta_item) as items,
  (select count(*) from public.movimiento_inventario) as movimientos, (select count(*) from public.cobranza) as cobranzas;

-- Mediciones (objetivos: reporte y EECC < 5 s, listados < 1 s) ---------------------------------
\timing on
select set_config('request.jwt.claims', json_build_object('sub', (select id from vol_usuario), 'role', 'authenticated')::text, true),
  set_config('role', 'authenticated', true) \gset vol_
\echo '· reporte_liquidacion (LP, ayer, día abierto: en vivo)'
select length(public.reporte_liquidacion((select id from public.regional where codigo = 'LP'), app.hoy() - 1)::text) \gset vol_
\echo '· eecc_consolidado (todas, a hoy)'
select length(public.eecc_consolidado(app.hoy())::text) \gset vol_
\echo '· dashboard_kpis (todas, mes en curso)'
select length(public.dashboard_kpis(null)::text) \gset vol_
\echo '· avisos_shell (todas)'
select length(public.avisos_shell(null)::text) \gset vol_
\echo '· reporte_movimiento_periodo (LP, 30 días)'
select length(public.reporte_movimiento_periodo((select id from public.regional where codigo = 'LP'), app.hoy() - 30, app.hoy())::text) \gset vol_
\echo '· reporte_top_clientes (todas, 60 días)'
select count(*) from public.reporte_top_clientes(app.hoy() - 60, app.hoy(), null, null, null, 50) \gset vol_
\echo '· listado v_nota_venta: página 1 (50) + count exact, LP, 30 días'
select count(*) from (select count(*) over (), id, numero, total, saldo from public.v_nota_venta
where regional_id = (select id from public.regional where codigo = 'LP') and fecha >= app.hoy() - 30
order by fecha desc, numero desc limit 50) x \gset vol_
\echo '· listado v_saldo_documento de un cliente'
select count(*) from public.v_saldo_documento where cliente_id = (select id from public.cliente where nombre = 'VOLUMEN LP 2') and saldo > 0 \gset vol_
\timing off

rollback;
