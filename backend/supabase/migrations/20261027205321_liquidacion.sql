-- Liquidación / reporte diario: cálculo de la matriz, totales y reporte (Reglas de Cálculo §3, Contrato §6.1). BE-18.

-- Matriz en vivo de la regional r en la fecha D (Reglas §3.1): todos los productos activos y los
-- inactivos con algún valor; orden de la planilla (línea, producto, nombre).
create function app.calcular_liquidacion(p_regional uuid, p_fecha date)
returns setof app.t_linea_liquidacion language sql stable security definer set search_path = '' as $$
  with mov as (
    select m.producto_id,
      coalesce(sum(m.cantidad) filter (where m.fecha < p_fecha), 0) as saldo_inicial,
      coalesce(sum(m.cantidad) filter (where m.fecha = p_fecha and m.tipo = 'ingreso'), 0) as pedido,
      coalesce(sum(m.cantidad) filter (where m.fecha = p_fecha and m.tipo in ('traspaso_entrada', 'traspaso_salida')), 0) as traspaso,
      coalesce(sum(m.cantidad) filter (where m.fecha = p_fecha and m.tipo = 'devolucion'), 0) as devolucion,
      coalesce(sum(m.cantidad) filter (where m.fecha = p_fecha and m.tipo = 'ajuste'), 0) as ajuste
    from public.movimiento_inventario m
    where m.regional_id = p_regional and m.fecha <= p_fecha
    group by m.producto_id
  ),
  ventas as (
    -- bruto de las notas emitidas del día (⚠ SUP-11)
    select i.producto_id,
      coalesce(sum(i.cantidad) filter (where n.condicion_tipo = 'contado'), 0) as contado_q,
      coalesce(sum(i.subtotal) filter (where n.condicion_tipo = 'contado'), 0) as contado_bs,
      coalesce(sum(i.cantidad) filter (where n.condicion_tipo = 'credito'), 0) as credito_q,
      coalesce(sum(i.subtotal) filter (where n.condicion_tipo = 'credito'), 0) as credito_bs
    from public.nota_venta n
    join public.nota_venta_item i on i.nota_venta_id = n.id
    where n.regional_id = p_regional and n.fecha = p_fecha and n.estado = 'emitida'
    group by i.producto_id
  ),
  filas as (
    select p.id as producto_id, p.linea_id, l.orden as orden_linea, p.orden as orden_producto, p.nombre as producto_nombre,
      l.nombre as linea_nombre, p.precio_base as precio_unit, p.activo,
      coalesce(m.saldo_inicial, 0) as saldo_inicial, coalesce(m.pedido, 0) as pedido, coalesce(m.traspaso, 0) as traspaso,
      coalesce(m.devolucion, 0) as devolucion, coalesce(m.ajuste, 0) as ajuste,
      coalesce(v.contado_q, 0) as contado_q, coalesce(v.contado_bs, 0) as contado_bs,
      coalesce(v.credito_q, 0) as credito_q, coalesce(v.credito_bs, 0) as credito_bs
    from public.producto p
    join public.linea_comercial l on l.id = p.linea_id
    left join mov m on m.producto_id = p.id
    left join ventas v on v.producto_id = p.id
  )
  select
    f.producto_id, f.linea_id, f.orden_linea, f.orden_producto, f.producto_nombre, f.linea_nombre, f.precio_unit,
    f.saldo_inicial, f.pedido, f.traspaso, f.devolucion, f.ajuste,
    f.contado_q, f.contado_bs, f.credito_q, f.credito_bs,
    f.contado_q + f.credito_q, f.contado_bs + f.credito_bs,
    f.saldo_inicial + f.pedido + f.traspaso + f.devolucion + f.ajuste - f.contado_q - f.credito_q,
    (f.pedido <> 0 or f.traspaso <> 0 or f.devolucion <> 0 or f.ajuste <> 0 or f.contado_q + f.credito_q <> 0)
  from filas f
  where f.activo
     or f.saldo_inicial <> 0 or f.pedido <> 0 or f.traspaso <> 0 or f.devolucion <> 0 or f.ajuste <> 0 or f.contado_q + f.credito_q <> 0
  order by f.orden_linea, f.orden_producto, f.producto_nombre;
$$;

-- Totales del día (Reglas §3.2 y §3.3): bruto y descuentos por condición, cobranzas, reembolsos,
-- Total Ventas = neto contado + neto crédito, Total Efectivo = neto contado + cobranzas − reembolsos.
create function app.totales_liquidacion(p_regional uuid, p_fecha date)
returns app.t_totales_liquidacion language sql stable security definer set search_path = '' as $$
  with notas as (
    select n.condicion_tipo, b.bruto, round(b.bruto * (1 - n.descuento_pct / 100), 2) as total
    from public.nota_venta n
    cross join lateral (select coalesce(sum(i.subtotal), 0) as bruto from public.nota_venta_item i where i.nota_venta_id = n.id) b
    where n.regional_id = p_regional and n.fecha = p_fecha and n.estado = 'emitida'
  ),
  t as (
    select
      coalesce(sum(bruto) filter (where condicion_tipo = 'contado'), 0) as contado_bruto,
      coalesce(sum(bruto) filter (where condicion_tipo = 'credito'), 0) as credito_bruto,
      coalesce(sum(bruto - total) filter (where condicion_tipo = 'contado'), 0) as descuento_contado,
      coalesce(sum(bruto - total) filter (where condicion_tipo = 'credito'), 0) as descuento_credito
    from notas
  ),
  c as (
    select coalesce(sum(x.importe), 0) as cobranzas from public.cobranza x
    where x.regional_id = p_regional and x.fecha = p_fecha and x.estado = 'vigente'
  ),
  r as (
    select coalesce(sum(app.importe_devolucion(d.id)), 0) as reembolsos from public.devolucion d
    where d.regional_id = p_regional and d.fecha = p_fecha and d.tipo_reverso = 'reembolso'
  )
  select (
    t.contado_bruto, t.credito_bruto, t.descuento_contado, t.descuento_credito, c.cobranzas, r.reembolsos,
    (t.contado_bruto - t.descuento_contado) + (t.credito_bruto - t.descuento_credito),
    (t.contado_bruto - t.descuento_contado) + c.cobranzas - r.reembolsos
  )::app.t_totales_liquidacion
  from t, c, r;
$$;

revoke execute on all functions in schema app from public;

-- Reporte del día (Contrato §6.1). Abierto: en vivo; cerrado: del snapshot y los totales guardados.
-- Definer con control explícito: lo ve quien ve la regional.
create function public.reporte_liquidacion(p_regional_id uuid, p_fecha date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_regional public.regional;
  v_liquidacion public.liquidacion;
  v_cerrada boolean;
  v_cierre date;
  v_tot app.t_totales_liquidacion;
  v_lineas jsonb;
  v_filas jsonb;
begin
  if not app.puede_leer_regional(p_regional_id) then
    perform app.error('NO_AUTORIZADO', 'No tiene acceso a esta regional.', jsonb_build_object('regional_id', p_regional_id));
  end if;
  select * into v_regional from public.regional where id = p_regional_id;
  select * into v_liquidacion from public.liquidacion where regional_id = p_regional_id and fecha = p_fecha;
  v_cerrada := coalesce(v_liquidacion.estado = 'cerrada', false);
  v_cierre := app.ultimo_cierre(p_regional_id);

  -- filas: snapshot si está cerrada, cálculo en vivo si no
  if v_cerrada then
    v_tot := (v_liquidacion.total_contado_bruto, v_liquidacion.total_credito_bruto, v_liquidacion.descuento_contado,
              v_liquidacion.descuento_credito, v_liquidacion.total_cobranzas, v_liquidacion.total_reembolsos,
              v_liquidacion.total_ventas, v_liquidacion.total_efectivo)::app.t_totales_liquidacion;
    select jsonb_agg(to_jsonb(x) order by x.orden_linea, x.orden_producto, x.producto_nombre) into v_filas
    from (
      select ll.producto_id, ll.linea_id, ll.orden_linea, ll.orden_producto, ll.producto_nombre, ll.linea_nombre, ll.precio_unit,
        ll.saldo_inicial, ll.pedido, ll.traspaso, ll.devolucion, ll.ajuste,
        ll.venta_contado_q, ll.venta_contado_bs, ll.venta_credito_q, ll.venta_credito_bs, ll.total_ventas_q, ll.total_ventas_bs, ll.saldo_final,
        (ll.pedido <> 0 or ll.traspaso <> 0 or ll.devolucion <> 0 or ll.ajuste <> 0 or ll.total_ventas_q <> 0) as con_movimiento
      from public.liquidacion_linea ll where ll.liquidacion_id = v_liquidacion.id
    ) x;
  else
    v_tot := app.totales_liquidacion(p_regional_id, p_fecha);
    select jsonb_agg(to_jsonb(c)) into v_filas from app.calcular_liquidacion(p_regional_id, p_fecha) c;
  end if;

  -- agrupadas por línea, como la planilla
  select jsonb_agg(jsonb_build_object('linea_id', g.linea_id, 'linea', g.linea_nombre, 'orden_linea', g.orden_linea, 'productos', g.productos)
                   order by g.orden_linea, g.linea_nombre)
  into v_lineas
  from (
    select f ->> 'linea_id' as linea_id, f ->> 'linea_nombre' as linea_nombre, (f ->> 'orden_linea')::int as orden_linea,
      jsonb_agg(jsonb_build_object(
        'producto_id', f -> 'producto_id', 'producto', f -> 'producto_nombre', 'orden', f -> 'orden_producto', 'precio_unit', f -> 'precio_unit',
        'saldo_inicial', f -> 'saldo_inicial', 'pedido', f -> 'pedido', 'traspaso', f -> 'traspaso', 'devolucion', f -> 'devolucion', 'ajuste', f -> 'ajuste',
        'venta_contado_q', f -> 'venta_contado_q', 'venta_contado_bs', f -> 'venta_contado_bs',
        'venta_credito_q', f -> 'venta_credito_q', 'venta_credito_bs', f -> 'venta_credito_bs',
        'total_ventas_q', f -> 'total_ventas_q', 'total_ventas_bs', f -> 'total_ventas_bs',
        'saldo_final', f -> 'saldo_final', 'con_movimiento', f -> 'con_movimiento')
        order by (f ->> 'orden_producto')::int, f ->> 'producto_nombre') as productos
    from jsonb_array_elements(coalesce(v_filas, '[]')) f
    group by 1, 2, 3
  ) g;

  return jsonb_build_object(
    'regional', jsonb_build_object('id', v_regional.id, 'codigo', v_regional.codigo, 'nombre', v_regional.nombre),
    'fecha', p_fecha,
    'estado', case when v_cerrada then 'cerrada' else 'abierta' end,
    'cerrada_por', case when v_cerrada then app.nombre_usuario(v_liquidacion.cerrada_por) end,
    'cerrada_en', case when v_cerrada then v_liquidacion.cerrada_en end,
    'ultimo_cerrado', case when v_cierre > '-infinity'::date then v_cierre end,
    'columnas_extra', jsonb_build_object(
      'devolucion', exists (select 1 from jsonb_array_elements(coalesce(v_filas, '[]')) f where (f ->> 'devolucion')::numeric <> 0),
      'ajuste', exists (select 1 from jsonb_array_elements(coalesce(v_filas, '[]')) f where (f ->> 'ajuste')::numeric <> 0)),
    'lineas', coalesce(v_lineas, '[]'),
    'pie', jsonb_build_object(
      'contado_bruto', v_tot.total_contado_bruto, 'credito_bruto', v_tot.total_credito_bruto,
      'descuento_contado', v_tot.descuento_contado, 'descuento_credito', v_tot.descuento_credito,
      'contado_neto', v_tot.total_contado_bruto - v_tot.descuento_contado,
      'credito_neto', v_tot.total_credito_bruto - v_tot.descuento_credito,
      'total_ventas', v_tot.total_ventas),
    'arqueo', jsonb_build_object(
      'contado', v_tot.total_contado_bruto - v_tot.descuento_contado,
      'credito', v_tot.total_credito_bruto - v_tot.descuento_credito,
      'cobranzas', v_tot.total_cobranzas, 'reembolsos', v_tot.total_reembolsos,
      'total_ventas', v_tot.total_ventas, 'total_efectivo', v_tot.total_efectivo,
      'cobranzas_por_forma', coalesce((
        select jsonb_agg(jsonb_build_object('forma_pago', x.forma_pago, 'importe', x.importe) order by x.forma_pago)
        from (select c.forma_pago, sum(c.importe) as importe from public.cobranza c
              where c.regional_id = p_regional_id and c.fecha = p_fecha and c.estado = 'vigente' group by c.forma_pago) x), '[]')),
    -- notas del día: las anuladas al final, sin sumar (⚠ SUP-46)
    'notas', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'numero', n.numero, 'numero_factura', n.numero_factura, 'cliente', n.cliente_nombre,
        'vendedor', n.vendedor_nombre, 'condicion', n.condicion_tipo, 'total', n.total, 'estado', n.estado)
        order by n.estado = 'anulada', n.created_at)
      from public.v_nota_venta n where n.regional_id = p_regional_id and n.fecha = p_fecha), '[]'),
    'subtotales_notas', (
      select jsonb_build_object(
        'contado', coalesce(sum(n.total) filter (where n.condicion_tipo = 'contado'), 0),
        'credito', coalesce(sum(n.total) filter (where n.condicion_tipo = 'credito'), 0),
        'total', coalesce(sum(n.total), 0), 'cantidad', count(*))
      from public.v_nota_venta n where n.regional_id = p_regional_id and n.fecha = p_fecha and n.estado = 'emitida'),
    'cobranzas', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'cliente', c.cliente_nombre,
        'documento', case when c.tipo_doc = 'nota' then c.documento_numero || coalesce(' / ' || c.numero_factura, '') else 'Saldo inicial ' || c.documento_numero end,
        'forma_pago', c.forma_pago, 'referencia', c.referencia_pago, 'importe', c.importe) order by c.numero)
      from public.v_cobranza c where c.regional_id = p_regional_id and c.fecha = p_fecha and c.estado = 'vigente'), '[]'),
    'devoluciones', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'numero', d.numero, 'nota', d.nota_numero, 'cliente', d.cliente_nombre,
        'tipo_reverso', d.tipo_reverso, 'importe', d.importe) order by d.numero)
      from public.v_devolucion d where d.regional_id = p_regional_id and d.fecha = p_fecha), '[]'),
    'validaciones_cierre', jsonb_build_object(
      'dias_anteriores_abiertos', coalesce((
        select jsonb_agg(l.fecha order by l.fecha) from public.liquidacion l
        where l.regional_id = p_regional_id and l.estado = 'abierta' and l.fecha < p_fecha), '[]'),
      'notas_sin_factura', coalesce((
        select jsonb_agg(jsonb_build_object('id', n.id, 'numero', n.numero, 'cliente', n.cliente_nombre, 'total', n.total) order by n.created_at)
        from public.v_nota_venta n where n.regional_id = p_regional_id and n.fecha = p_fecha and n.pendiente_factura), '[]'))
  );
end $$;

revoke all on function public.reporte_liquidacion(uuid, date) from public, anon;
grant execute on function public.reporte_liquidacion(uuid, date) to authenticated;
