-- Cierre y reapertura del día, días pendientes e historial (Contrato §5.4 y §6, Reglas §3.5 y §11). BE-19.

-- Historial de liquidaciones.
create view public.v_liquidacion with (security_invoker = true) as
select l.*, r.codigo as regional_codigo, app.nombre_usuario(l.cerrada_por) as cerrada_por_nombre
from public.liquidacion l
join public.regional r on r.id = l.regional_id;

grant select on public.v_liquidacion to authenticated;

-- Días abiertos anteriores a hoy (para los avisos y el historial). p_regional_id nulo = las que ve.
create function public.dias_pendientes_cierre(p_regional_id uuid default null)
returns table (regional_id uuid, fecha date, notas_sin_factura int)
language sql stable security invoker set search_path = '' as $$
  select l.regional_id, l.fecha,
    (select count(*)::int from public.nota_venta n
     where n.regional_id = l.regional_id and n.fecha = l.fecha and n.estado = 'emitida' and n.numero_factura is null)
  from public.liquidacion l
  where l.estado = 'abierta' and l.fecha < app.hoy() and (p_regional_id is null or l.regional_id = p_regional_id)
  order by l.fecha, l.regional_id;
$$;

-- Cerrar el día: exige los días anteriores cerrados y todas las notas con factura (⚠ SUP-06, SUP-20).
-- Si el día no tenía fila (sin movimiento) la crea y la cierra igual. Congela la matriz (snapshot) y los totales.
create function public.cerrar_liquidacion(p_regional_id uuid, p_fecha date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_anteriores jsonb;
  v_pendientes jsonb;
  v_tot app.t_totales_liquidacion;
begin
  perform app.exigir_escritura(p_regional_id);
  -- crea y bloquea la fila del día: los movimientos en curso terminan antes (FECHA_INVALIDA / DIA_CERRADO)
  v_id := app.asegurar_dia_abierto(p_regional_id, p_fecha);

  select jsonb_agg(l.fecha order by l.fecha) into v_anteriores
  from public.liquidacion l where l.regional_id = p_regional_id and l.estado = 'abierta' and l.fecha < p_fecha;
  if v_anteriores is not null then
    perform app.error('DIA_ANTERIOR_ABIERTO', format('Primero cierre el %s.', to_char((v_anteriores ->> 0)::date, 'DD/MM/YYYY')),
      jsonb_build_object('fechas', v_anteriores));
  end if;

  select jsonb_agg(jsonb_build_object('id', n.id, 'numero', n.numero, 'cliente', c.nombre) order by n.created_at) into v_pendientes
  from public.nota_venta n join public.cliente c on c.id = n.cliente_id
  where n.regional_id = p_regional_id and n.fecha = p_fecha and n.estado = 'emitida' and n.numero_factura is null;
  if v_pendientes is not null then
    perform app.error('FACTURA_PENDIENTE', format('Faltan %s factura(s) para cerrar el día.', jsonb_array_length(v_pendientes)),
      jsonb_build_object('notas', v_pendientes));
  end if;

  -- snapshot de la matriz con nombres, orden y precio congelados (Reglas §3.5)
  insert into public.liquidacion_linea (
    liquidacion_id, producto_id, linea_id, orden_linea, orden_producto, producto_nombre, linea_nombre, precio_unit,
    saldo_inicial, pedido, traspaso, devolucion, ajuste, venta_contado_q, venta_contado_bs, venta_credito_q, venta_credito_bs,
    total_ventas_q, total_ventas_bs, saldo_final
  )
  select v_id, c.producto_id, c.linea_id, c.orden_linea, c.orden_producto, c.producto_nombre, c.linea_nombre, c.precio_unit,
    c.saldo_inicial, c.pedido, c.traspaso, c.devolucion, c.ajuste, c.venta_contado_q, c.venta_contado_bs, c.venta_credito_q, c.venta_credito_bs,
    c.total_ventas_q, c.total_ventas_bs, c.saldo_final
  from app.calcular_liquidacion(p_regional_id, p_fecha) c;

  v_tot := app.totales_liquidacion(p_regional_id, p_fecha);
  update public.liquidacion set
    estado = 'cerrada', cerrada_por = auth.uid(), cerrada_en = now(),
    total_contado_bruto = v_tot.total_contado_bruto, total_credito_bruto = v_tot.total_credito_bruto,
    descuento_contado = v_tot.descuento_contado, descuento_credito = v_tot.descuento_credito,
    total_cobranzas = v_tot.total_cobranzas, total_reembolsos = v_tot.total_reembolsos,
    total_ventas = v_tot.total_ventas, total_efectivo = v_tot.total_efectivo
  where id = v_id;

  perform app.auditar('cerrar_dia', 'liquidacion', v_id::text, p_regional_id, jsonb_build_object('fecha', p_fecha, 'totales', to_jsonb(v_tot)));

  return jsonb_build_object('id', v_id, 'estado', 'cerrada', 'totales', jsonb_build_object(
    'contado_bruto', v_tot.total_contado_bruto, 'credito_bruto', v_tot.total_credito_bruto,
    'descuento_contado', v_tot.descuento_contado, 'descuento_credito', v_tot.descuento_credito,
    'contado_neto', v_tot.total_contado_bruto - v_tot.descuento_contado,
    'credito_neto', v_tot.total_credito_bruto - v_tot.descuento_credito,
    'total_ventas', v_tot.total_ventas));
end $$;

-- Reabrir: solo el nacional y solo el último día cerrado (⚠ SUP-21). La auditoría guarda el snapshot y los
-- totales que se borran.
create function public.reabrir_liquidacion(p_regional_id uuid, p_fecha date, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_liquidacion public.liquidacion;
  v_cierre date;
  v_lineas jsonb;
begin
  perform app.exigir_nacional();
  if nullif(btrim(p_motivo), '') is null then
    perform app.error('VALIDACION', 'El motivo de la reapertura es obligatorio.', jsonb_build_object('campo', 'motivo', 'motivo', 'vacio'));
  end if;

  select * into v_liquidacion from public.liquidacion where regional_id = p_regional_id and fecha = p_fecha for update;
  v_cierre := app.ultimo_cierre(p_regional_id);
  if v_liquidacion.id is null or v_liquidacion.estado <> 'cerrada' or p_fecha <> v_cierre then
    perform app.error('REAPERTURA_NO_PERMITIDA',
      case when v_cierre > '-infinity'::date then format('Solo se puede reabrir el %s.', to_char(v_cierre, 'DD/MM/YYYY'))
           else 'La regional no tiene días cerrados.' end,
      jsonb_build_object('ultimo_cierre', case when v_cierre > '-infinity'::date then v_cierre end));
  end if;

  select jsonb_agg(to_jsonb(ll) - 'id' - 'liquidacion_id' order by ll.orden_linea, ll.orden_producto) into v_lineas
  from public.liquidacion_linea ll where ll.liquidacion_id = v_liquidacion.id;
  perform app.auditar('reabrir_dia', 'liquidacion', v_liquidacion.id::text, p_regional_id, jsonb_build_object(
    'fecha', p_fecha, 'motivo', btrim(p_motivo),
    'cerrada_por', v_liquidacion.cerrada_por, 'cerrada_en', v_liquidacion.cerrada_en,
    'totales', to_jsonb(v_liquidacion) - array['id', 'regional_id', 'fecha', 'estado', 'cerrada_por', 'cerrada_en',
      'reabierta_por', 'reabierta_en', 'motivo_reapertura', 'created_at', 'updated_at'],
    'lineas', coalesce(v_lineas, '[]'::jsonb)));

  -- tg_inmutable deja borrar el snapshot solo dentro de esta función
  perform set_config('app.reabriendo', 'on', true);
  delete from public.liquidacion_linea where liquidacion_id = v_liquidacion.id;
  perform set_config('app.reabriendo', 'off', true);

  update public.liquidacion set
    estado = 'abierta', cerrada_por = null, cerrada_en = null,
    reabierta_por = auth.uid(), reabierta_en = now(), motivo_reapertura = btrim(p_motivo),
    total_contado_bruto = null, total_credito_bruto = null, descuento_contado = null, descuento_credito = null,
    total_cobranzas = null, total_reembolsos = null, total_ventas = null, total_efectivo = null
  where id = v_liquidacion.id;

  return jsonb_build_object('id', v_liquidacion.id, 'estado', 'abierta');
end $$;

revoke all on function
  public.dias_pendientes_cierre(uuid),
  public.cerrar_liquidacion(uuid, date),
  public.reabrir_liquidacion(uuid, date, text)
  from public, anon;
grant execute on function
  public.dias_pendientes_cierre(uuid),
  public.cerrar_liquidacion(uuid, date),
  public.reabrir_liquidacion(uuid, date, text)
  to authenticated;
