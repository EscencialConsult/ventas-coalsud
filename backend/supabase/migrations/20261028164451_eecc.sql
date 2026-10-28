-- EECC consolidado: saldos por cobrar a una fecha de corte, por mes de origen (Reglas §5–6, Contrato §6.2). BE-20.

-- Saldo de un documento por cobrar a la fecha de corte (Reglas §5); sin corte, a hoy.
-- Nota a crédito: total − cobranzas vigentes − abonos de devoluciones con fecha ≤ corte.
-- Cartera inicial: importe − cobranzas vigentes con fecha ≤ corte. Un documento posterior al corte vale 0.
create function app.saldo_documento(p_tipo text, p_id uuid, p_corte date default null)
returns numeric language sql stable security definer set search_path = '' as $$
  with corte as (select coalesce(p_corte, app.hoy()) as c)
  select case p_tipo
    when 'nota' then (
      select round(coalesce(sum(i.subtotal), 0) * (1 - n.descuento_pct / 100), 2)
        - coalesce((select sum(x.importe) from public.cobranza x
                    where x.nota_venta_id = n.id and x.estado = 'vigente' and x.fecha <= k.c), 0)
        - coalesce((select sum(app.importe_devolucion(d.id)) from public.devolucion d
                    where d.nota_venta_id = n.id and d.tipo_reverso = 'abono_cuenta' and d.fecha <= k.c), 0)
      from public.nota_venta n
      cross join corte k
      left join public.nota_venta_item i on i.nota_venta_id = n.id
      where n.id = p_id and n.estado = 'emitida' and n.condicion_tipo = 'credito' and n.fecha <= k.c
      group by n.id, n.descuento_pct, k.c)
    when 'saldo_inicial' then (
      select s.importe - coalesce((select sum(x.importe) from public.cobranza x
                                   where x.cxc_saldo_inicial_id = s.id and x.estado = 'vigente' and x.fecha <= k.c), 0)
      from public.cxc_saldo_inicial s
      cross join corte k
      where s.id = p_id and s.fecha_documento <= k.c)
  end;
$$;

revoke execute on all functions in schema app from public;

-- EECC (⚠ SUP-26, SUP-27): solo nacional. Columnas: "año anterior" acumulado + cada mes del año de corte
-- hasta el mes de corte. Agrupa regional → categoría → cliente, con subtotales y SALDO ACTUAL.
-- Vencido / mora a la fecha de corte; VENDEDOR = el asignado al cliente.
create function public.eecc_consolidado(p_fecha_corte date, p_regional_id uuid default null, p_categoria text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_corte date := coalesce(p_fecha_corte, app.hoy());
  v_anio int := extract(year from v_corte)::int;
  v_meses text[] := array['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
                          'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  v_claves text[];
  v_columnas jsonb;
  v_resultado jsonb;
begin
  perform app.exigir_nacional();

  select array['anterior'] || array_agg(format('%s-%s', v_anio, lpad(m::text, 2, '0')) order by m),
    jsonb_build_array(jsonb_build_object('clave', 'anterior', 'etiqueta', (v_anio - 1)::text))
      || jsonb_agg(jsonb_build_object('clave', format('%s-%s', v_anio, lpad(m::text, 2, '0')), 'etiqueta', v_meses[m]) order by m)
  into v_claves, v_columnas
  from generate_series(1, extract(month from v_corte)::int) m;

  with documentos as (
    select n.regional_id, n.cliente_id, n.fecha, n.fecha_vencimiento as vence, app.saldo_documento('nota', n.id, v_corte) as saldo
    from public.nota_venta n
    where n.estado = 'emitida' and n.condicion_tipo = 'credito' and n.fecha <= v_corte
      and (p_regional_id is null or n.regional_id = p_regional_id)
    union all
    select s.regional_id, s.cliente_id, s.fecha_documento, coalesce(s.fecha_vencimiento, s.fecha_documento),
      app.saldo_documento('saldo_inicial', s.id, v_corte)
    from public.cxc_saldo_inicial s
    where s.fecha_documento <= v_corte and (p_regional_id is null or s.regional_id = p_regional_id)
  ),
  pendientes as (
    select d.*, c.categoria,
      case when extract(year from d.fecha) < v_anio then 'anterior' else to_char(d.fecha, 'YYYY-MM') end as columna
    from documentos d
    join public.cliente c on c.id = d.cliente_id
    where d.saldo > 0 and (p_categoria is null or c.categoria = p_categoria)
  ),
  celdas as (
    -- saldo por cliente y columna (todas las columnas, también las vacías)
    select x.cliente_id, k.clave, coalesce(sum(p.saldo), 0.00) as saldo
    from (select distinct cliente_id from pendientes) x
    cross join unnest(v_claves) k (clave)
    left join pendientes p on p.cliente_id = x.cliente_id and p.columna = k.clave
    group by x.cliente_id, k.clave
  ),
  clientes as (
    select c.regional_id, upper(r.nombre) as regional, c.categoria, c.id as cliente_id, c.nombre as cliente, v.nombre as vendedor,
      (select jsonb_object_agg(ce.clave, ce.saldo) from celdas ce where ce.cliente_id = c.id) as saldos,
      t.total, t.vencido, t.max_dias_mora
    from (
      select p.cliente_id, sum(p.saldo) as total,
        coalesce(sum(p.saldo) filter (where p.vence < v_corte), 0.00) as vencido,
        coalesce(max(v_corte - p.vence) filter (where p.vence < v_corte), 0) as max_dias_mora
      from pendientes p group by p.cliente_id
    ) t
    join public.cliente c on c.id = t.cliente_id
    join public.regional r on r.id = c.regional_id
    left join public.vendedor v on v.id = c.vendedor_id
  ),
  grupos as (
    select g.regional, g.categoria,
      jsonb_agg(jsonb_build_object('cliente_id', g.cliente_id, 'cliente', g.cliente, 'vendedor', g.vendedor, 'saldos', g.saldos,
        'total', g.total, 'vencido', g.vencido, 'max_dias_mora', g.max_dias_mora) order by g.cliente) as clientes,
      (select jsonb_object_agg(k.clave, coalesce((select sum(ce.saldo) from celdas ce join clientes c2 on c2.cliente_id = ce.cliente_id
                                                   where c2.regional = g.regional and c2.categoria = g.categoria and ce.clave = k.clave), 0.00))
       from unnest(v_claves) k (clave)) || jsonb_build_object('total', sum(g.total)) as subtotal
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
      select jsonb_agg(jsonb_build_object('regional', g.regional, 'categoria', g.categoria, 'clientes', g.clientes, 'subtotal', g.subtotal)
        order by g.regional, array_position(array['supermercado', 'mayorista', 'minorista', 'institucional'], g.categoria))
      from grupos g), '[]'),
    'total_general', (
      select jsonb_object_agg(k.clave, coalesce((select sum(ce.saldo) from celdas ce where ce.clave = k.clave), 0.00))
      from unnest(v_claves) k (clave)) || jsonb_build_object('total', coalesce((select sum(total) from clientes), 0.00))
  ) into v_resultado;

  return v_resultado;
end $$;

revoke all on function public.eecc_consolidado(date, uuid, text) from public, anon;
grant execute on function public.eecc_consolidado(date, uuid, text) to authenticated;
