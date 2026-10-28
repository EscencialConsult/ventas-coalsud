-- Lecturas de inventario (Esquema BD §2, Contrato de API §4 y §6, Reglas de Cálculo §7.1).
-- Vistas con security_invoker y RPC security invoker: respetan la RLS de quien consulta.

-- El libro mayor ordena por (fecha, created_at): con now() todos los movimientos de una misma transacción
-- empatan; clock_timestamp() conserva el orden real de inserción para el kardex.
alter table public.movimiento_inventario alter column created_at set default clock_timestamp();

-- Nombre de un usuario para mostrar "registrado por", aunque la RLS de usuario no deje ver la fila
-- (p. ej. quien hizo un traspaso recibido desde otra regional). Solo el nombre.
create function app.nombre_usuario(p_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select u.nombre from public.usuario u where u.id = p_id;
$$;

revoke execute on all functions in schema app from public;
grant execute on function app.nombre_usuario(uuid) to authenticated;

-- Stock por ubicación. Almacén: todo producto activo en cada almacén que el usuario ve, con 0 si nunca
-- se movió (para alertar faltantes), y los inactivos que todavía tienen saldo. Vendedor: sus saldos.
create view public.v_stock with (security_invoker = true) as
with ubicaciones as (
  select a.regional_id, a.id as almacen_id, null::uuid as vendedor_id, p.id as producto_id, coalesce(s.cantidad, 0) as cantidad
  from public.almacen a
  cross join public.producto p
  left join public.stock_saldo s on s.almacen_id = a.id and s.vendedor_id is null and s.producto_id = p.id
  -- producto y almacén los ve todo usuario activo: se acota a las regionales propias
  where a.activo and a.regional_id in (select app.mis_regionales())
    and (p.activo or coalesce(s.cantidad, 0) <> 0)
  union all
  select s.regional_id, s.almacen_id, s.vendedor_id, s.producto_id, s.cantidad
  from public.stock_saldo s
  where s.vendedor_id is not null
)
select
  u.producto_id,
  p.nombre as producto_nombre,
  p.linea_id,
  l.nombre as linea_nombre,
  l.orden * 1000 + p.orden as orden,  -- ⚙ DT-25: orden del reporte (línea, producto)
  u.regional_id,
  case when u.vendedor_id is null then 'almacen' else 'vendedor' end as ubicacion,
  u.almacen_id,
  a.nombre as almacen_nombre,
  u.vendedor_id,
  v.nombre as vendedor_nombre,
  u.cantidad,
  p.stock_minimo,
  u.vendedor_id is null and p.stock_minimo > 0 and u.cantidad < p.stock_minimo as bajo_minimo,
  p.precio_base  -- ⚙ DT-24: valoriza la mercadería en poder de los vendedores
from ubicaciones u
join public.producto p on p.id = u.producto_id
join public.linea_comercial l on l.id = p.linea_id
join public.almacen a on a.id = u.almacen_id
left join public.vendedor v on v.id = u.vendedor_id;

-- Historial de movimientos con nombres y el N° del documento, la nota o la devolución que lo originó.
create view public.v_movimiento with (security_invoker = true) as
select
  m.id, m.fecha, m.tipo, m.regional_id,
  m.almacen_id, a.nombre as almacen_nombre,
  m.vendedor_id, v.nombre as vendedor_nombre,
  m.producto_id, p.nombre as producto_nombre,
  m.cantidad,
  m.documento_id, m.nota_venta_id, m.devolucion_id,
  coalesce(d.numero, n.numero, dv.numero) as documento_numero,
  app.nombre_usuario(m.usuario_id) as usuario_nombre,
  m.created_at
from public.movimiento_inventario m
join public.almacen a on a.id = m.almacen_id
join public.producto p on p.id = m.producto_id
left join public.vendedor v on v.id = m.vendedor_id
left join public.documento_inventario d on d.id = m.documento_id
left join public.nota_venta n on n.id = m.nota_venta_id
left join public.devolucion dv on dv.id = m.devolucion_id;

-- Documentos de inventario (⚙ DT-25): la regional destino también ve los traspasos que recibe.
create view public.v_documento_inventario with (security_invoker = true) as
select
  d.id, d.numero, d.tipo, d.regional_id,
  d.almacen_id, a.nombre as almacen_nombre,
  d.almacen_destino_id, ad.nombre as almacen_destino_nombre, ad.regional_id as regional_destino_id,
  d.vendedor_id, v.nombre as vendedor_nombre,
  d.fecha, d.referencia, d.motivo,
  (select count(*)::int from public.documento_inventario_item i where i.documento_id = d.id) as items,
  app.nombre_usuario(d.usuario_id) as usuario_nombre,
  d.created_at
from public.documento_inventario d
join public.almacen a on a.id = d.almacen_id
left join public.almacen ad on ad.id = d.almacen_destino_id
left join public.vendedor v on v.id = d.vendedor_id;

grant select on public.v_stock, public.v_movimiento, public.v_documento_inventario to authenticated;

-- Kardex de una ubicación y producto: saldo anterior y nuevo en cada movimiento (⚙ DT-25: con el id).
create function public.kardex(
  p_almacen_id uuid, p_vendedor_id uuid, p_producto_id uuid, p_desde date default null, p_hasta date default null
)
returns table (
  id uuid, fecha date, tipo text, documento text, cantidad numeric,
  saldo_anterior numeric, saldo_nuevo numeric, usuario text
)
language sql stable security invoker set search_path = '' as $$
  with ubicacion as (
    select m.* from public.movimiento_inventario m
    where m.almacen_id = p_almacen_id and m.vendedor_id is not distinct from p_vendedor_id and m.producto_id = p_producto_id
  ),
  inicial as (
    select coalesce(sum(u.cantidad), 0) as saldo from ubicacion u where p_desde is not null and u.fecha < p_desde
  ),
  periodo as (
    select u.*, (select saldo from inicial) + sum(u.cantidad) over (order by u.fecha, u.created_at, u.id) as acumulado
    from ubicacion u
    where (p_desde is null or u.fecha >= p_desde) and (p_hasta is null or u.fecha <= p_hasta)
  )
  select
    p.id, p.fecha, p.tipo,
    coalesce(d.numero, n.numero, dv.numero) as documento,
    p.cantidad,
    p.acumulado - p.cantidad as saldo_anterior,
    p.acumulado as saldo_nuevo,
    app.nombre_usuario(p.usuario_id) as usuario
  from periodo p
  left join public.documento_inventario d on d.id = p.documento_id
  left join public.nota_venta n on n.id = p.nota_venta_id
  left join public.devolucion dv on dv.id = p.devolucion_id
  order by p.fecha, p.created_at, p.id;
$$;

-- Saldo en poder de vendedores en el período (Reglas de Cálculo §7.1). p_regional_id nulo = las que ve.
create function public.saldo_vendedores(p_regional_id uuid default null, p_desde date default null, p_hasta date default null)
returns table (
  vendedor_id uuid, vendedor text, producto_id uuid, producto text,
  saldo_inicial numeric, entregado numeric, vendido numeric, retornado numeric, saldo_final numeric, valorizado numeric
)
language sql stable security invoker set search_path = '' as $$
  with resumen as (
    select
      m.vendedor_id, m.producto_id,
      coalesce(sum(m.cantidad) filter (where m.fecha < p_desde), 0) as saldo_inicial,
      coalesce(sum(m.cantidad) filter (where m.tipo = 'salida' and m.fecha >= coalesce(p_desde, m.fecha)), 0) as entregado,
      coalesce(-sum(m.cantidad) filter (where m.tipo in ('venta', 'anulacion') and m.fecha >= coalesce(p_desde, m.fecha)), 0) as vendido,
      coalesce(-sum(m.cantidad) filter (where m.tipo = 'retorno' and m.fecha >= coalesce(p_desde, m.fecha)), 0) as retornado,
      sum(m.cantidad) as saldo_final
    from public.movimiento_inventario m
    where m.vendedor_id is not null
      and (p_regional_id is null or m.regional_id = p_regional_id)
      and (p_hasta is null or m.fecha <= p_hasta)
    group by m.vendedor_id, m.producto_id
  )
  select
    r.vendedor_id, v.nombre, r.producto_id, p.nombre,
    r.saldo_inicial, r.entregado, r.vendido, r.retornado, r.saldo_final,
    round(r.saldo_final * p.precio_base, 2) as valorizado
  from resumen r
  join public.vendedor v on v.id = r.vendedor_id
  join public.producto p on p.id = r.producto_id
  join public.linea_comercial l on l.id = p.linea_id
  where r.saldo_inicial <> 0 or r.entregado <> 0 or r.vendido <> 0 or r.retornado <> 0 or r.saldo_final <> 0
  order by v.nombre, l.orden, p.orden;
$$;

revoke all on function
  public.kardex(uuid, uuid, uuid, date, date),
  public.saldo_vendedores(uuid, date, date)
  from public, anon;
grant execute on function
  public.kardex(uuid, uuid, uuid, date, date),
  public.saldo_vendedores(uuid, date, date)
  to authenticated;
