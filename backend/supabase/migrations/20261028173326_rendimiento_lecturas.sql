-- Rendimiento de las lecturas calculadas (RNF-01, BE-22, ⚙ DT-39).
-- Leídas como invoker, las tablas hijas (nota_venta_item, devolucion_item) evalúan su política por fila
-- (exists sobre el padre, que a su vez llama a app.mis_regionales()): con ~180.000 ítems eso tarda segundos.
-- Estas funciones pasan a definer y acotan explícitamente a app.mis_regionales() una sola vez por consulta:
-- el usuario ve exactamente lo mismo que con la RLS.

-- Partidas de ventas netas (⚙ DT-31): mismo resultado que en BE-21, ahora acotado a las regionales del usuario.
create or replace function app.ventas_netas(p_desde date, p_hasta date)
returns table (origen text, regional_id uuid, fecha date, nota_venta_id uuid, cliente_id uuid, vendedor_id uuid, importe numeric)
language sql stable security definer set search_path = '' as $$
  select 'nota', n.regional_id, n.fecha, n.id, n.cliente_id, n.vendedor_id, round(b.bruto * (1 - n.descuento_pct / 100), 2)
  from public.nota_venta n
  cross join lateral (select coalesce(sum(i.subtotal), 0) as bruto from public.nota_venta_item i where i.nota_venta_id = n.id) b
  where n.estado = 'emitida' and n.fecha between p_desde and p_hasta and n.regional_id in (select app.mis_regionales())
  union all
  select 'devolucion', d.regional_id, d.fecha, n.id, n.cliente_id, n.vendedor_id, -app.importe_devolucion(d.id)
  from public.devolucion d
  join public.nota_venta n on n.id = d.nota_venta_id
  where d.fecha between p_desde and p_hasta and d.regional_id in (select app.mis_regionales())
$$;

-- Documentos por cobrar con su saldo a la fecha de corte (Reglas §5), en conjuntos: notas a crédito emitidas
-- (total − cobranzas vigentes − abonos, con fecha ≤ corte) y cartera inicial (importe − cobranzas vigentes).
-- Incluye los saldados (saldo 0): filtra quien llama. Acotado a las regionales del usuario.
create function app.documentos_por_cobrar(p_corte date)
returns table (tipo_doc text, documento_id uuid, regional_id uuid, cliente_id uuid, fecha date, vence date, saldo numeric)
language sql stable security definer set search_path = '' as $$
  with notas as (
    select n.id, n.regional_id, n.cliente_id, n.fecha, n.fecha_vencimiento as vence, n.descuento_pct
    from public.nota_venta n
    where n.estado = 'emitida' and n.condicion_tipo = 'credito' and n.fecha <= p_corte and n.regional_id in (select app.mis_regionales())
  ),
  brutos as (
    select i.nota_venta_id, sum(i.subtotal) as bruto
    from public.nota_venta_item i join notas n on n.id = i.nota_venta_id
    group by i.nota_venta_id
  ),
  cobros as (
    select x.nota_venta_id, x.cxc_saldo_inicial_id, sum(x.importe) as importe
    from public.cobranza x
    where x.estado = 'vigente' and x.fecha <= p_corte and x.regional_id in (select app.mis_regionales())
    group by x.nota_venta_id, x.cxc_saldo_inicial_id
  ),
  abonos as (
    -- importe de cada devolución redondeado una vez, como app.importe_devolucion (Reglas §4)
    select a.nota_venta_id, sum(a.importe) as importe
    from (
      select d.nota_venta_id, round(sum(di.cantidad * di.precio_aplicado) * (1 - n.descuento_pct / 100), 2) as importe
      from public.devolucion d
      join notas n on n.id = d.nota_venta_id
      join public.devolucion_item di on di.devolucion_id = d.id
      where d.tipo_reverso = 'abono_cuenta' and d.fecha <= p_corte
      group by d.id, d.nota_venta_id, n.descuento_pct
    ) a
    group by a.nota_venta_id
  )
  select 'nota', n.id, n.regional_id, n.cliente_id, n.fecha, n.vence,
    round(coalesce(b.bruto, 0) * (1 - n.descuento_pct / 100), 2) - coalesce(c.importe, 0) - coalesce(a.importe, 0)
  from notas n
  left join brutos b on b.nota_venta_id = n.id
  left join cobros c on c.nota_venta_id = n.id
  left join abonos a on a.nota_venta_id = n.id
  union all
  select 'saldo_inicial', s.id, s.regional_id, s.cliente_id, s.fecha_documento, coalesce(s.fecha_vencimiento, s.fecha_documento),
    s.importe - coalesce(c.importe, 0)
  from public.cxc_saldo_inicial s
  left join cobros c on c.cxc_saldo_inicial_id = s.id
  where s.fecha_documento <= p_corte and s.regional_id in (select app.mis_regionales())
$$;

revoke execute on all functions in schema app from public;
grant execute on function app.documentos_por_cobrar(date) to authenticated;

-- Productos más vendidos: definer acotado a las regionales del usuario (antes invoker, misma salida).
create or replace function public.reporte_productos_vendidos(
  p_desde date, p_hasta date, p_regional_id uuid default null, p_linea_id uuid default null,
  p_vendedor_id uuid default null, p_limite int default 10
)
returns table (producto_id uuid, producto text, linea text, unidades numeric, bs_netos numeric)
language sql stable security definer set search_path = '' as $$
  with partidas as (
    select i.producto_id, i.cantidad, round(i.subtotal * (1 - n.descuento_pct / 100), 2) as bs
    from public.nota_venta n
    join public.nota_venta_item i on i.nota_venta_id = n.id
    where n.estado = 'emitida' and n.fecha between coalesce(p_desde, '-infinity') and coalesce(p_hasta, 'infinity')
      and n.regional_id in (select app.mis_regionales())
      and (p_regional_id is null or n.regional_id = p_regional_id)
      and (p_vendedor_id is null or n.vendedor_id = p_vendedor_id)
    union all
    select di.producto_id, -di.cantidad, -round(di.cantidad * di.precio_aplicado * (1 - n.descuento_pct / 100), 2)
    from public.devolucion d
    join public.devolucion_item di on di.devolucion_id = d.id
    join public.nota_venta n on n.id = d.nota_venta_id
    where d.fecha between coalesce(p_desde, '-infinity') and coalesce(p_hasta, 'infinity')
      and d.regional_id in (select app.mis_regionales())
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

-- Dashboard: CxC a hoy con app.documentos_por_cobrar (antes v_saldo_documento, que calcula cada nota por fila).
create or replace function public.dashboard_kpis(p_regional_id uuid default null, p_desde date default null, p_hasta date default null)
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
        'saldo', coalesce(sum(d.saldo), 0.00),
        'vencido', coalesce(sum(d.saldo) filter (where d.vence < v_hoy), 0.00))
      from app.documentos_por_cobrar(v_hoy) d
      where d.saldo > 0 and (p_regional_id is null or d.regional_id = p_regional_id)));
  end if;
  return v_resultado;
end $$;

-- EECC: los saldos a la fecha de corte salen de app.documentos_por_cobrar (misma salida que BE-20).
create or replace function public.eecc_consolidado(p_fecha_corte date, p_regional_id uuid default null, p_categoria text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_corte date := coalesce(p_fecha_corte, app.hoy());
  v_anio int := extract(year from v_corte)::int;
  v_meses text[] := array['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
                          'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  v_columnas jsonb;
  v_ceros jsonb;
  v_resultado jsonb;
begin
  perform app.exigir_nacional();

  -- columnas: año anterior acumulado + cada mes del año de corte hasta el mes de corte (⚠ SUP-26)
  select jsonb_build_array(jsonb_build_object('clave', 'anterior', 'etiqueta', (v_anio - 1)::text))
      || jsonb_agg(jsonb_build_object('clave', format('%s-%s', v_anio, lpad(m::text, 2, '0')), 'etiqueta', v_meses[m]) order by m),
    jsonb_build_object('anterior', 0.00) || jsonb_object_agg(format('%s-%s', v_anio, lpad(m::text, 2, '0')), 0.00)
  into v_columnas, v_ceros
  from generate_series(1, extract(month from v_corte)::int) m;

  with pendientes as (
    select d.cliente_id, d.saldo, d.vence, upper(r.nombre) as regional, c.categoria,
      case when extract(year from d.fecha) < v_anio then 'anterior' else to_char(d.fecha, 'YYYY-MM') end as columna
    from app.documentos_por_cobrar(v_corte) d
    join public.cliente c on c.id = d.cliente_id
    join public.regional r on r.id = c.regional_id
    where d.saldo > 0 and (p_regional_id is null or d.regional_id = p_regional_id) and (p_categoria is null or c.categoria = p_categoria)
  ),
  por_columna as (
    select p.cliente_id, p.columna, sum(p.saldo) as saldo from pendientes p group by p.cliente_id, p.columna
  ),
  clientes as (
    select t.regional, t.categoria, t.cliente_id, c.nombre as cliente, v.nombre as vendedor, t.total, t.vencido, t.max_dias_mora,
      v_ceros || (select jsonb_object_agg(pc.columna, pc.saldo) from por_columna pc where pc.cliente_id = t.cliente_id) as saldos
    from (
      select p.regional, p.categoria, p.cliente_id, sum(p.saldo) as total,
        coalesce(sum(p.saldo) filter (where p.vence < v_corte), 0.00) as vencido,
        coalesce(max(v_corte - p.vence) filter (where p.vence < v_corte), 0) as max_dias_mora
      from pendientes p
      group by p.regional, p.categoria, p.cliente_id
    ) t
    join public.cliente c on c.id = t.cliente_id
    left join public.vendedor v on v.id = c.vendedor_id
  ),
  subtotales as (
    select x.regional, x.categoria, jsonb_object_agg(x.columna, x.saldo) as saldos
    from (select p.regional, p.categoria, p.columna, sum(p.saldo) as saldo from pendientes p group by 1, 2, 3) x
    group by x.regional, x.categoria
  ),
  grupos as (
    select g.regional, g.categoria,
      jsonb_agg(jsonb_build_object('cliente_id', g.cliente_id, 'cliente', g.cliente, 'vendedor', g.vendedor, 'saldos', g.saldos,
        'total', g.total, 'vencido', g.vencido, 'max_dias_mora', g.max_dias_mora) order by g.cliente) as clientes,
      sum(g.total) as total
    from clientes g
    group by g.regional, g.categoria
  )
  select jsonb_build_object(
    'fecha_corte', v_corte,
    'columnas', v_columnas,
    'kpis', jsonb_build_object(
      'saldo_total', coalesce((select sum(total) from clientes), 0.00),
      'vencido', coalesce((select sum(vencido) from clientes), 0.00),
      'clientes_con_saldo', (select count(*) from clientes),
      'clientes_en_mora', (select count(*) from clientes where vencido > 0)),
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object('regional', g.regional, 'categoria', g.categoria, 'clientes', g.clientes,
          'subtotal', v_ceros || s.saldos || jsonb_build_object('total', g.total))
        order by g.regional, array_position(array['supermercado', 'mayorista', 'minorista', 'institucional'], g.categoria))
      from grupos g join subtotales s on s.regional = g.regional and s.categoria = g.categoria), '[]'),
    'total_general', v_ceros
      || coalesce((select jsonb_object_agg(x.columna, x.saldo) from (select p.columna, sum(p.saldo) as saldo from pendientes p group by 1) x), '{}')
      || jsonb_build_object('total', coalesce((select sum(total) from clientes), 0.00))
  ) into v_resultado;

  return v_resultado;
end $$;
