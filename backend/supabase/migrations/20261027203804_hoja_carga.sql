-- Hoja de carga por vendedor (Contrato de API §6, Reglas de Cálculo §7.3, ⚠ SUP-53). BE-15.
-- Notas emitidas de la regional en la fecha (las anuladas no cuentan); una hoja por vendedor.
-- Security invoker: respeta la RLS.
create function public.hoja_carga(p_regional_id uuid, p_fecha date, p_vendedor_id uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with notas as (
    select n.id, n.numero, n.created_at, n.vendedor_id, n.vendedor_nombre, n.cliente_nombre, c.zona, n.condicion_nombre, n.bruto, n.total
    from public.v_nota_venta n
    join public.cliente c on c.id = n.cliente_id
    where n.regional_id = p_regional_id and n.fecha = p_fecha and n.estado = 'emitida'
      and (p_vendedor_id is null or n.vendedor_id = p_vendedor_id)
  ),
  productos as (
    select nt.vendedor_id, i.producto_id, p.nombre as producto, l.nombre as linea, l.orden as orden_linea, p.orden as orden_producto,
      sum(i.cantidad) as cantidad, sum(i.subtotal) as bs
    from notas nt
    join public.nota_venta_item i on i.nota_venta_id = nt.id
    join public.producto p on p.id = i.producto_id
    join public.linea_comercial l on l.id = p.linea_id
    group by nt.vendedor_id, i.producto_id, p.nombre, l.nombre, l.orden, p.orden
  ),
  hojas as (
    select nt.vendedor_nombre, jsonb_build_object(
      'vendedor_id', nt.vendedor_id,
      'vendedor', nt.vendedor_nombre,
      'productos', (
        select jsonb_agg(jsonb_build_object('producto_id', pr.producto_id, 'producto', pr.producto, 'linea', pr.linea,
          'cantidad', pr.cantidad, 'bs', pr.bs) order by pr.orden_linea, pr.orden_producto)
        from productos pr where pr.vendedor_id = nt.vendedor_id),
      'notas', (
        select jsonb_agg(jsonb_build_object('id', x.id, 'numero', x.numero, 'cliente', x.cliente_nombre, 'zona', x.zona,
          'condicion', x.condicion_nombre, 'total', x.total) order by x.created_at)
        from notas x where x.vendedor_id = nt.vendedor_id),
      'totales', jsonb_build_object(
        'unidades', (select sum(pr.cantidad) from productos pr where pr.vendedor_id = nt.vendedor_id),
        'bruto', sum(nt.bruto),
        'descuento', sum(nt.bruto) - sum(nt.total),
        'neto', sum(nt.total))
    ) as hoja
    from notas nt
    group by nt.vendedor_id, nt.vendedor_nombre
  )
  select coalesce(jsonb_agg(h.hoja order by h.vendedor_nombre), '[]'::jsonb) from hojas h;
$$;

revoke all on function public.hoja_carga(uuid, date, uuid) from public, anon;
grant execute on function public.hoja_carga(uuid, date, uuid) to authenticated;
