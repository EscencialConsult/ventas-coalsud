-- EECC en conjuntos (RNF-01: < 5 s con ~36.000 notas). BE-22.
-- Misma salida que la versión de BE-20 (Reglas §5–6, Contrato §6.2, ⚙ DT-38), pero los saldos a la fecha de
-- corte se calculan con agregados (bruto, cobranzas y abonos por documento) en lugar de una llamada a
-- app.saldo_documento por documento.
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

  with notas as (
    select n.id, n.regional_id, n.cliente_id, n.fecha, n.fecha_vencimiento as vence, n.descuento_pct
    from public.nota_venta n
    where n.estado = 'emitida' and n.condicion_tipo = 'credito' and n.fecha <= v_corte
      and (p_regional_id is null or n.regional_id = p_regional_id)
  ),
  brutos as (
    select i.nota_venta_id, sum(i.subtotal) as bruto
    from public.nota_venta_item i join notas n on n.id = i.nota_venta_id
    group by i.nota_venta_id
  ),
  cobros as (
    select x.nota_venta_id, x.cxc_saldo_inicial_id, sum(x.importe) as importe
    from public.cobranza x
    where x.estado = 'vigente' and x.fecha <= v_corte
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
      where d.tipo_reverso = 'abono_cuenta' and d.fecha <= v_corte
      group by d.id, d.nota_venta_id, n.descuento_pct
    ) a
    group by a.nota_venta_id
  ),
  documentos as (
    select n.cliente_id, n.fecha, n.vence,
      round(coalesce(b.bruto, 0) * (1 - n.descuento_pct / 100), 2) - coalesce(c.importe, 0) - coalesce(a.importe, 0) as saldo
    from notas n
    left join brutos b on b.nota_venta_id = n.id
    left join cobros c on c.nota_venta_id = n.id
    left join abonos a on a.nota_venta_id = n.id
    union all
    select s.cliente_id, s.fecha_documento, coalesce(s.fecha_vencimiento, s.fecha_documento), s.importe - coalesce(c.importe, 0)
    from public.cxc_saldo_inicial s
    left join cobros c on c.cxc_saldo_inicial_id = s.id
    where s.fecha_documento <= v_corte and (p_regional_id is null or s.regional_id = p_regional_id)
  ),
  pendientes as (
    select d.cliente_id, d.saldo, d.vence, upper(r.nombre) as regional, c.categoria,
      case when extract(year from d.fecha) < v_anio then 'anterior' else to_char(d.fecha, 'YYYY-MM') end as columna
    from documentos d
    join public.cliente c on c.id = d.cliente_id
    join public.regional r on r.id = c.regional_id
    where d.saldo > 0 and (p_categoria is null or c.categoria = p_categoria)
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
