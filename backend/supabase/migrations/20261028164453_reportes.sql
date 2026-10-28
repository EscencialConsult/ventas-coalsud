-- Reportes comerciales, presupuesto, dashboard, avisos del shell y vista de auditoría
-- (Contrato §4 y §6, Reglas §8–10, ⚙ DT-21, DT-23, DT-29). BE-21.

-- Ventas netas -----------------------------------------------------------------------------
-- Partidas de ventas netas en [desde, hasta] (Reglas §9): + total de cada nota emitida con fecha en el
-- rango y − importe de cada devolución con fecha en el rango, sobre cualquier nota (⚙ DT-31), con el
-- cliente y el vendedor de la nota. Invoker: la RLS de quien consulta acota las regionales.
create function app.ventas_netas(p_desde date, p_hasta date)
returns table (origen text, regional_id uuid, fecha date, nota_venta_id uuid, cliente_id uuid, vendedor_id uuid, importe numeric)
language sql stable security invoker set search_path = '' as $$
  select 'nota', n.regional_id, n.fecha, n.id, n.cliente_id, n.vendedor_id,
    round(coalesce((select sum(i.subtotal) from public.nota_venta_item i where i.nota_venta_id = n.id), 0) * (1 - n.descuento_pct / 100), 2)
  from public.nota_venta n
  where n.estado = 'emitida' and n.fecha between p_desde and p_hasta
  union all
  select 'devolucion', d.regional_id, d.fecha, n.id, n.cliente_id, n.vendedor_id, -app.importe_devolucion(d.id)
  from public.devolucion d
  join public.nota_venta n on n.id = d.nota_venta_id
  where d.fecha between p_desde and p_hasta;
$$;

revoke execute on all functions in schema app from public;
-- app.error solo lanza el error de negocio: las lecturas invoker (dashboard_kpis) validan con él.
grant execute on function app.ventas_netas(date, date), app.error(text, text, jsonb) to authenticated;

-- Reportes (RF28, Reglas §9) ---------------------------------------------------------------
-- Todos son invoker: cada usuario ve solo sus regionales (p_regional_id = null → todas las que lee).

create function public.reporte_top_clientes(
  p_desde date, p_hasta date, p_regional_id uuid default null, p_vendedor_id uuid default null,
  p_categoria text default null, p_limite int default 10
)
returns table (cliente_id uuid, cliente text, regional text, categoria text, ventas_netas numeric, notas int)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.nombre, r.codigo, c.categoria, sum(v.importe), (count(*) filter (where v.origen = 'nota'))::int
  from app.ventas_netas(coalesce(p_desde, '-infinity'), coalesce(p_hasta, 'infinity')) v
  join public.cliente c on c.id = v.cliente_id
  join public.regional r on r.id = v.regional_id
  where (p_regional_id is null or v.regional_id = p_regional_id)
    and (p_vendedor_id is null or v.vendedor_id = p_vendedor_id)
    and (p_categoria is null or c.categoria = p_categoria)
  group by c.id, c.nombre, r.codigo, c.categoria
  order by sum(v.importe) desc, c.nombre
  limit coalesce(p_limite, 10);
$$;

-- Unidades y Bs netos por producto: ítems de las notas del período (con el descuento de la nota)
-- − ítems de las devoluciones del período (precio y descuento de la nota original).
create function public.reporte_productos_vendidos(
  p_desde date, p_hasta date, p_regional_id uuid default null, p_linea_id uuid default null,
  p_vendedor_id uuid default null, p_limite int default 10
)
returns table (producto_id uuid, producto text, linea text, unidades numeric, bs_netos numeric)
language sql stable security invoker set search_path = '' as $$
  with partidas as (
    select i.producto_id, i.cantidad, round(i.subtotal * (1 - n.descuento_pct / 100), 2) as bs
    from public.nota_venta n
    join public.nota_venta_item i on i.nota_venta_id = n.id
    where n.estado = 'emitida' and n.fecha between coalesce(p_desde, '-infinity') and coalesce(p_hasta, 'infinity')
      and (p_regional_id is null or n.regional_id = p_regional_id)
      and (p_vendedor_id is null or n.vendedor_id = p_vendedor_id)
    union all
    select di.producto_id, -di.cantidad, -round(di.cantidad * di.precio_aplicado * (1 - n.descuento_pct / 100), 2)
    from public.devolucion d
    join public.devolucion_item di on di.devolucion_id = d.id
    join public.nota_venta n on n.id = d.nota_venta_id
    where d.fecha between coalesce(p_desde, '-infinity') and coalesce(p_hasta, 'infinity')
      and (p_regional_id is null or d.regional_id = p_regional_id)
      and (p_vendedor_id is null or n.vendedor_id = p_vendedor_id)
  )
  select p.id, p.nombre, l.nombre, sum(x.cantidad), sum(x.bs)
  from partidas x
  join public.producto p on p.id = x.producto_id
  join public.linea_comercial l on l.id = p.linea_id
  where p_linea_id is null or p.linea_id = p_linea_id
  group by p.id, p.nombre, l.nombre
  order by sum(x.bs) desc, p.nombre
  limit coalesce(p_limite, 10);
$$;

-- Rotación (⚠ SUP-35): vendidas / stock promedio de la regional ((inicial + final) / 2);
-- días de inventario = días del período / rotación (nulo sin rotación). Solo productos con algún valor (⚙ DT-34).
create function public.reporte_rotacion(p_regional_id uuid, p_desde date, p_hasta date)
returns table (
  producto_id uuid, producto text, linea text, vendidas numeric, stock_inicial numeric, stock_final numeric,
  stock_promedio numeric, rotacion numeric, dias_inventario numeric
)
language sql stable security invoker set search_path = '' as $$
  with mov as (
    select m.producto_id,
      coalesce(sum(m.cantidad) filter (where m.fecha < p_desde), 0) as inicial,
      sum(m.cantidad) as final,
      -coalesce(sum(m.cantidad) filter (where m.fecha >= p_desde and m.tipo in ('venta', 'anulacion')), 0) as vendidas
    from public.movimiento_inventario m
    where m.regional_id = p_regional_id and m.fecha <= p_hasta
    group by m.producto_id
  ),
  calculo as (
    select m.*, round((m.inicial + m.final) / 2, 2) as promedio from mov m
    where m.inicial <> 0 or m.final <> 0 or m.vendidas <> 0
  )
  select p.id, p.nombre, l.nombre, c.vendidas, c.inicial, c.final, c.promedio,
    case when c.promedio > 0 then round(c.vendidas / c.promedio, 2) else 0 end,
    case when c.promedio > 0 and c.vendidas > 0 then round((p_hasta - p_desde + 1) * c.promedio / c.vendidas) end
  from calculo c
  join public.producto p on p.id = c.producto_id
  join public.linea_comercial l on l.id = p.linea_id
  order by 8 desc, p.nombre;
$$;

-- Ventas netas por regional y mes del rango (meses sin ventas en 0). Cada usuario ve sus regionales (⚙ DT-33).
create function public.reporte_ventas_regional(p_desde date, p_hasta date)
returns table (regional_id uuid, regional text, mes text, ventas_netas numeric)
language sql stable security invoker set search_path = '' as $$
  with meses as (
    select to_char(g, 'YYYY-MM') as mes from generate_series(date_trunc('month', p_desde), date_trunc('month', p_hasta), interval '1 month') g
  ),
  ventas as (
    select v.regional_id, to_char(v.fecha, 'YYYY-MM') as mes, sum(v.importe) as total
    from app.ventas_netas(p_desde, p_hasta) v
    group by 1, 2
  )
  select r.id, r.nombre, m.mes, coalesce(v.total, 0.00)
  from meses m
  cross join public.regional r
  left join ventas v on v.regional_id = r.id and v.mes = m.mes
  where r.id in (select app.mis_regionales()) and (r.activo or v.total is not null)
  order by m.mes, r.nombre;
$$;

-- Resumen de movimiento por período (⚠ SUP-54, ⚙ DT-32): la matriz de la liquidación con [desde, hasta]
-- en lugar de un día. Cantidades y, por cada columna, su valor en Bs (_bs): ventas a lo cobrado (bruto),
-- el resto a precio_base vigente. Pie: ventas, descuentos, cobranzas y reembolsos del rango.
create function public.reporte_movimiento_periodo(p_regional_id uuid, p_desde date, p_hasta date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_regional public.regional;
  v_filas jsonb;
  v_lineas jsonb;
  v_pie jsonb;
begin
  if not app.puede_leer_regional(p_regional_id) then
    perform app.error('NO_AUTORIZADO', 'No tiene acceso a esta regional.', jsonb_build_object('regional_id', p_regional_id));
  end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    perform app.error('VALIDACION', 'El período no es válido.', jsonb_build_object('campo', 'desde', 'motivo', 'rango_invalido'));
  end if;
  select * into v_regional from public.regional where id = p_regional_id;

  with mov as (
    select m.producto_id,
      coalesce(sum(m.cantidad) filter (where m.fecha < p_desde), 0) as saldo_inicial,
      coalesce(sum(m.cantidad) filter (where m.fecha >= p_desde and m.tipo = 'ingreso'), 0) as pedido,
      coalesce(sum(m.cantidad) filter (where m.fecha >= p_desde and m.tipo in ('traspaso_entrada', 'traspaso_salida')), 0) as traspaso,
      coalesce(sum(m.cantidad) filter (where m.fecha >= p_desde and m.tipo = 'devolucion'), 0) as devolucion,
      coalesce(sum(m.cantidad) filter (where m.fecha >= p_desde and m.tipo = 'ajuste'), 0) as ajuste
    from public.movimiento_inventario m
    where m.regional_id = p_regional_id and m.fecha <= p_hasta
    group by m.producto_id
  ),
  ventas as (
    select i.producto_id,
      coalesce(sum(i.cantidad) filter (where n.condicion_tipo = 'contado'), 0) as contado_q,
      coalesce(sum(i.subtotal) filter (where n.condicion_tipo = 'contado'), 0) as contado_bs,
      coalesce(sum(i.cantidad) filter (where n.condicion_tipo = 'credito'), 0) as credito_q,
      coalesce(sum(i.subtotal) filter (where n.condicion_tipo = 'credito'), 0) as credito_bs
    from public.nota_venta n
    join public.nota_venta_item i on i.nota_venta_id = n.id
    where n.regional_id = p_regional_id and n.fecha between p_desde and p_hasta and n.estado = 'emitida'
    group by i.producto_id
  ),
  filas as (
    select p.id as producto_id, p.linea_id, l.orden as orden_linea, p.orden as orden_producto, p.nombre as producto_nombre,
      l.nombre as linea_nombre, p.precio_base as precio, p.activo,
      coalesce(m.saldo_inicial, 0) as si, coalesce(m.pedido, 0) as pedido, coalesce(m.traspaso, 0) as traspaso,
      coalesce(m.devolucion, 0) as devolucion, coalesce(m.ajuste, 0) as ajuste,
      coalesce(v.contado_q, 0) as cq, coalesce(v.contado_bs, 0) as cbs, coalesce(v.credito_q, 0) as rq, coalesce(v.credito_bs, 0) as rbs
    from public.producto p
    join public.linea_comercial l on l.id = p.linea_id
    left join mov m on m.producto_id = p.id
    left join ventas v on v.producto_id = p.id
  ),
  calculo as (
    select f.*, f.si + f.pedido + f.traspaso + f.devolucion + f.ajuste - f.cq - f.rq as sf,
      (f.pedido <> 0 or f.traspaso <> 0 or f.devolucion <> 0 or f.ajuste <> 0 or f.cq + f.rq <> 0) as con_movimiento
    from filas f
  )
  select jsonb_agg(jsonb_build_object(
      'linea_id', c.linea_id, 'linea_nombre', c.linea_nombre, 'orden_linea', c.orden_linea, 'orden_producto', c.orden_producto,
      'producto_nombre', c.producto_nombre,
      'producto', jsonb_build_object(
        'producto_id', c.producto_id, 'producto', c.producto_nombre, 'orden', c.orden_producto, 'precio_unit', c.precio,
        'saldo_inicial', c.si, 'saldo_inicial_bs', round(c.si * c.precio, 2),
        'pedido', c.pedido, 'pedido_bs', round(c.pedido * c.precio, 2),
        'traspaso', c.traspaso, 'traspaso_bs', round(c.traspaso * c.precio, 2),
        'devolucion', c.devolucion, 'devolucion_bs', round(c.devolucion * c.precio, 2),
        'ajuste', c.ajuste, 'ajuste_bs', round(c.ajuste * c.precio, 2),
        'venta_contado_q', c.cq, 'venta_contado_bs', c.cbs, 'venta_credito_q', c.rq, 'venta_credito_bs', c.rbs,
        'total_ventas_q', c.cq + c.rq, 'total_ventas_bs', c.cbs + c.rbs,
        'saldo_final', c.sf, 'saldo_final_bs', round(c.sf * c.precio, 2),
        'con_movimiento', c.con_movimiento)))
  into v_filas
  from calculo c
  where c.activo or c.si <> 0 or c.con_movimiento;

  -- agrupadas por línea, como la planilla
  select jsonb_agg(jsonb_build_object('linea_id', g.linea_id, 'linea', g.linea_nombre, 'orden_linea', g.orden_linea, 'productos', g.productos)
                   order by g.orden_linea, g.linea_nombre)
  into v_lineas
  from (
    select f ->> 'linea_id' as linea_id, f ->> 'linea_nombre' as linea_nombre, (f ->> 'orden_linea')::int as orden_linea,
      jsonb_agg(f -> 'producto' order by (f ->> 'orden_producto')::int, f ->> 'producto_nombre') as productos
    from jsonb_array_elements(coalesce(v_filas, '[]')) f
    group by 1, 2, 3
  ) g;

  with notas as (
    select n.condicion_tipo, b.bruto, round(b.bruto * (1 - n.descuento_pct / 100), 2) as total
    from public.nota_venta n
    cross join lateral (select coalesce(sum(i.subtotal), 0) as bruto from public.nota_venta_item i where i.nota_venta_id = n.id) b
    where n.regional_id = p_regional_id and n.fecha between p_desde and p_hasta and n.estado = 'emitida'
  ),
  t as (
    select
      coalesce(sum(bruto) filter (where condicion_tipo = 'contado'), 0) as contado_bruto,
      coalesce(sum(bruto) filter (where condicion_tipo = 'credito'), 0) as credito_bruto,
      coalesce(sum(total) filter (where condicion_tipo = 'contado'), 0) as contado_neto,
      coalesce(sum(total) filter (where condicion_tipo = 'credito'), 0) as credito_neto
    from notas
  )
  select jsonb_build_object(
    'contado_bruto', t.contado_bruto, 'credito_bruto', t.credito_bruto,
    'descuento_contado', t.contado_bruto - t.contado_neto, 'descuento_credito', t.credito_bruto - t.credito_neto,
    'contado_neto', t.contado_neto, 'credito_neto', t.credito_neto, 'total_ventas', t.contado_neto + t.credito_neto,
    'cobranzas', (select coalesce(sum(c.importe), 0) from public.cobranza c
                  where c.regional_id = p_regional_id and c.fecha between p_desde and p_hasta and c.estado = 'vigente'),
    'reembolsos', (select coalesce(sum(app.importe_devolucion(d.id)), 0) from public.devolucion d
                   where d.regional_id = p_regional_id and d.fecha between p_desde and p_hasta and d.tipo_reverso = 'reembolso'))
  into v_pie
  from t;

  return jsonb_build_object(
    'regional', jsonb_build_object('id', v_regional.id, 'codigo', v_regional.codigo, 'nombre', v_regional.nombre),
    'desde', p_desde,
    'hasta', p_hasta,
    'columnas_extra', jsonb_build_object(
      'devolucion', exists (select 1 from jsonb_array_elements(coalesce(v_filas, '[]')) f where (f #>> '{producto,devolucion}')::numeric <> 0),
      'ajuste', exists (select 1 from jsonb_array_elements(coalesce(v_filas, '[]')) f where (f #>> '{producto,ajuste}')::numeric <> 0)),
    'lineas', coalesce(v_lineas, '[]'),
    'pie', v_pie);
end $$;

-- Presupuesto (⚠ SUP-33) -------------------------------------------------------------------

-- Quien carga la meta es el usuario de la sesión (el frontend no lo manda, ⚙ DT-35).
create function app.tg_presupuesto_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.usuario_id := coalesce(auth.uid(), new.usuario_id);
  return new;
end $$;

revoke execute on all functions in schema app from public;
create trigger tg_presupuesto_usuario before insert on public.presupuesto for each row execute function app.tg_presupuesto_usuario();

-- Cumplimiento por meta del período (Reglas §8, ⚙ DT-29). Real = ventas netas del mes de la regional,
-- filtradas por el vendedor de la nota y/o la categoría del cliente si la meta lo indica.
create function public.cumplimiento_presupuesto(p_periodo text, p_regional_id uuid default null)
returns table (
  presupuesto_id uuid, periodo text, regional text, vendedor text, categoria text, meta numeric, "real" numeric,
  cumplimiento_pct numeric, proyeccion numeric, estado text, regional_id uuid, vendedor_id uuid, observaciones text
)
language sql stable security invoker set search_path = '' as $$
  with metas as (
    select p.*, m.inicio, (m.inicio + interval '1 month - 1 day')::date as fin
    from public.presupuesto p
    cross join lateral (select to_date(p.periodo || '-01', 'YYYY-MM-DD') as inicio) m
    where p.periodo = coalesce(p_periodo, to_char(app.hoy(), 'YYYY-MM'))
      and (p_regional_id is null or p.regional_id = p_regional_id)
  ),
  calculo as (
    select m.*,
      extract(day from m.fin)::int as dias_mes,
      case when m.periodo = to_char(app.hoy(), 'YYYY-MM') then extract(day from app.hoy())::int
           when m.periodo < to_char(app.hoy(), 'YYYY-MM') then extract(day from m.fin)::int
           else 0 end as transcurridos,
      coalesce((
        select sum(v.importe) from app.ventas_netas(m.inicio, m.fin) v
        join public.cliente c on c.id = v.cliente_id
        where v.regional_id = m.regional_id
          and (m.vendedor_id is null or v.vendedor_id = m.vendedor_id)
          and (m.categoria_cliente is null or c.categoria = m.categoria_cliente)), 0.00) as total_real
    from metas m
  ),
  resultado as (
    select c.*, case when c.transcurridos > 0 then round(c.total_real / c.transcurridos * c.dias_mes, 2) end as proyeccion_cierre
    from calculo c
  )
  select x.id, x.periodo, r.nombre, v.nombre, x.categoria_cliente, x.meta, x.total_real,
    round(x.total_real / x.meta * 100, 2), x.proyeccion_cierre,
    case
      when x.periodo < to_char(app.hoy(), 'YYYY-MM') then case when x.total_real >= x.meta then 'cumplido' else 'no_cumplido' end
      when x.total_real >= x.meta then 'cumplido'
      when x.proyeccion_cierre >= x.meta then 'en_camino'
      when x.proyeccion_cierre >= x.meta * 0.9 then 'en_riesgo'
      else 'bajo'
    end,
    x.regional_id, x.vendedor_id, x.observaciones
  from resultado x
  join public.regional r on r.id = x.regional_id
  left join public.vendedor v on v.id = x.vendedor_id
  -- primero la meta de la regional, después vendedores y categorías
  order by r.nombre, (x.vendedor_id is not null or x.categoria_cliente is not null), v.nombre nulls first, x.categoria_cliente nulls first;
$$;

-- Dashboard y avisos (RF31, Reglas §10) ----------------------------------------------------

-- KPIs de ventas (⚙ DT-21, DT-23). Sin rango: el mes en curso hasta hoy, contra el mismo tramo del mes
-- anterior. Con rango: [desde, hasta] contra los N días inmediatamente anteriores. variacion_pct es nula si el
-- período anterior no tuvo ventas (⚙ DT-36). cxc (a hoy) solo para el nacional (Q2).
create function public.dashboard_kpis(p_regional_id uuid default null, p_desde date default null, p_hasta date default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_hoy date := app.hoy();
  v_desde date;
  v_hasta date;
  v_ant_desde date;
  v_ant_hasta date;
  v_ventas_hoy numeric;
  v_periodo numeric;
  v_anterior numeric;
  v_serie jsonb;
  v_resultado jsonb;
begin
  if p_desde is null or p_hasta is null then
    v_desde := date_trunc('month', v_hoy)::date;
    v_hasta := v_hoy;
    v_ant_desde := (v_desde - interval '1 month')::date;
    v_ant_hasta := (v_hoy - interval '1 month')::date;  -- 31/03 → 28/02: el tramo no pasa del fin de mes
  else
    if p_desde > p_hasta then
      perform app.error('VALIDACION', 'El período no es válido.', jsonb_build_object('campo', 'desde', 'motivo', 'rango_invalido'));
    end if;
    v_desde := p_desde;
    v_hasta := p_hasta;
    v_ant_hasta := p_desde - 1;
    v_ant_desde := p_desde - (p_hasta - p_desde + 1);
  end if;

  select coalesce(sum(v.importe), 0.00) into v_ventas_hoy
  from app.ventas_netas(v_hoy, v_hoy) v where p_regional_id is null or v.regional_id = p_regional_id;

  select coalesce(sum(v.importe), 0.00) into v_anterior
  from app.ventas_netas(v_ant_desde, v_ant_hasta) v where p_regional_id is null or v.regional_id = p_regional_id;

  with dias as (
    select v.fecha, sum(v.importe) as ventas from app.ventas_netas(v_desde, v_hasta) v
    where p_regional_id is null or v.regional_id = p_regional_id
    group by v.fecha
  )
  select coalesce(sum(d.ventas), 0.00),
    jsonb_agg(jsonb_build_object('fecha', g::date, 'ventas', coalesce(d.ventas, 0.00)) order by g)
  into v_periodo, v_serie
  from generate_series(v_desde, v_hasta, interval '1 day') g
  left join dias d on d.fecha = g::date;

  v_resultado := jsonb_build_object(
    'ventas_hoy', v_ventas_hoy,
    'ventas_periodo', v_periodo,
    'variacion_pct', case when v_anterior > 0 then round((v_periodo - v_anterior) / v_anterior * 100, 2) end,
    'serie', coalesce(v_serie, '[]'));

  if app.is_nacional() then
    v_resultado := v_resultado || jsonb_build_object('cxc', (
      select jsonb_build_object(
        'saldo', coalesce(sum(s.saldo), 0.00),
        'vencido', coalesce(sum(s.saldo) filter (where s.vencido), 0.00))
      from public.v_saldo_documento s
      where s.saldo > 0 and (p_regional_id is null or s.regional_id = p_regional_id)));
  end if;
  return v_resultado;
end $$;

-- Badges del menú, campana, BannerDia y contadores del dashboard en un solo request (Contrato §6).
create function public.avisos_shell(p_regional_id uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'bajo_minimo', (select count(*) from public.v_stock s where s.bajo_minimo and (p_regional_id is null or s.regional_id = p_regional_id)),
    'notas_sin_factura', (select count(*) from public.nota_venta n
                          where n.estado = 'emitida' and n.numero_factura is null and (p_regional_id is null or n.regional_id = p_regional_id)),
    'dias_pendientes', coalesce((
      select jsonb_agg(jsonb_build_object('regional_id', d.regional_id, 'fecha', d.fecha, 'notas_sin_factura', d.notas_sin_factura)
        order by d.fecha, d.regional_id)
      from public.dias_pendientes_cierre(p_regional_id) d), '[]'));
$$;

-- Auditoría ---------------------------------------------------------------------------------
-- ⚙ DT-29: nombres y un texto legible del registro (N° de documento, fecha del día o nombre del maestro).
-- Invoker: la RLS de auditoria la deja solo al nacional. Sin usuario (proceso del sistema): 'Sistema'.
create view public.v_auditoria with (security_invoker = true) as
select
  a.id, a.created_at, a.usuario_id,
  coalesce(app.nombre_usuario(a.usuario_id), 'Sistema') as usuario_nombre,
  a.regional_id, r.codigo as regional_codigo,
  a.accion, a.entidad, a.entidad_id,
  case a.entidad
    when 'nota_venta' then (select x.numero from public.nota_venta x where x.id = a.entidad_id::uuid)
    when 'documento_inventario' then (select x.numero from public.documento_inventario x where x.id = a.entidad_id::uuid)
    when 'devolucion' then (select x.numero from public.devolucion x where x.id = a.entidad_id::uuid)
    when 'cobranza' then (select x.numero from public.cobranza x where x.id = a.entidad_id::uuid)
    when 'liquidacion' then (select x.fecha::text from public.liquidacion x where x.id = a.entidad_id::uuid)
    when 'cxc_saldo_inicial' then (select x.nombre from public.regional x where x.id = a.entidad_id::uuid)
    when 'usuario' then app.nombre_usuario(a.entidad_id::uuid)
    when 'cliente' then (select x.nombre from public.cliente x where x.id = a.entidad_id::uuid)
    when 'vendedor' then (select x.nombre from public.vendedor x where x.id = a.entidad_id::uuid)
    when 'producto' then (select x.nombre from public.producto x where x.id = a.entidad_id::uuid)
    when 'linea_comercial' then (select x.nombre from public.linea_comercial x where x.id = a.entidad_id::uuid)
    when 'condicion_pago' then (select x.nombre from public.condicion_pago x where x.id = a.entidad_id::uuid)
    when 'regional' then (select x.nombre from public.regional x where x.id = a.entidad_id::uuid)
    when 'almacen' then (select x.nombre from public.almacen x where x.id = a.entidad_id::uuid)
    when 'presupuesto' then (select x.periodo from public.presupuesto x where x.id = a.entidad_id::uuid)
  end as registro,
  a.datos
from public.auditoria a
left join public.regional r on r.id = a.regional_id;

grant select on public.v_auditoria to authenticated;

revoke all on function
  public.reporte_top_clientes(date, date, uuid, uuid, text, int),
  public.reporte_productos_vendidos(date, date, uuid, uuid, uuid, int),
  public.reporte_rotacion(uuid, date, date),
  public.reporte_ventas_regional(date, date),
  public.reporte_movimiento_periodo(uuid, date, date),
  public.cumplimiento_presupuesto(text, uuid),
  public.dashboard_kpis(uuid, date, date),
  public.avisos_shell(uuid)
  from public, anon;
grant execute on function
  public.reporte_top_clientes(date, date, uuid, uuid, text, int),
  public.reporte_productos_vendidos(date, date, uuid, uuid, uuid, int),
  public.reporte_rotacion(uuid, date, date),
  public.reporte_ventas_regional(date, date),
  public.reporte_movimiento_periodo(uuid, date, date),
  public.cumplimiento_presupuesto(text, uuid),
  public.dashboard_kpis(uuid, date, date),
  public.avisos_shell(uuid)
  to authenticated;
