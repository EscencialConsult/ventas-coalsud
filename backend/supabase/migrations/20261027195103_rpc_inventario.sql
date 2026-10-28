-- RPC de inventario (Contrato de API §5.1) y helpers que reusan todas las RPC transaccionales
-- (Esquema BD §3): día abierto, numeración, movimientos y lectura de ítems.

-- Helpers ----------------------------------------------------------------------------------

-- Reglas de Cálculo §11: fecha no futura, posterior al último cierre; crea y bloquea la fila de
-- liquidación del día para que un cierre concurrente espere a esta transacción.
create function app.asegurar_dia_abierto(p_regional uuid, p_fecha date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_liquidacion public.liquidacion;
  v_cierre date;
  r public.regional;
begin
  if p_fecha is null then
    perform app.error('VALIDACION', 'La fecha es obligatoria.', jsonb_build_object('campo', 'fecha', 'motivo', 'vacio'));
  end if;
  if p_fecha > app.hoy() then
    perform app.error('FECHA_INVALIDA', format('No se puede registrar con fecha futura (%s).', to_char(p_fecha, 'DD/MM/YYYY')),
      jsonb_build_object('fecha', p_fecha, 'hoy', app.hoy()));
  end if;

  insert into public.liquidacion (regional_id, fecha) values (p_regional, p_fecha) on conflict (regional_id, fecha) do nothing;
  select * into v_liquidacion from public.liquidacion where regional_id = p_regional and fecha = p_fecha for update;
  v_cierre := app.ultimo_cierre(p_regional);

  -- después del bloqueo: si un cierre terminó mientras esperábamos, ya se ve
  if v_liquidacion.estado = 'cerrada' or p_fecha <= v_cierre then
    select * into r from public.regional where id = p_regional;
    perform app.error('DIA_CERRADO', format('El día %s de %s está cerrado.', to_char(p_fecha, 'DD/MM/YYYY'), r.nombre),
      jsonb_build_object('regional', r.codigo, 'fecha', p_fecha, 'ultimo_cierre', v_cierre));
  end if;
  return v_liquidacion.id;
end $$;

-- Número siguiente por regional y tipo, sin huecos (el upsert bloquea la fila de correlativo hasta el
-- commit) ni reinicio anual (⚠ SUP-28): NI-LP-0001 … NI-LP-10000; la nota de venta sin prefijo (LP-0001).
create function app.siguiente_numero(p_regional uuid, p_tipo text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
  v_codigo text;
begin
  insert into public.correlativo as c (regional_id, tipo_documento, ultimo) values (p_regional, p_tipo, 1)
  on conflict (regional_id, tipo_documento) do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_n;
  select r.codigo into v_codigo from public.regional r where r.id = p_regional;

  return case p_tipo
      when 'nota_venta' then ''
      when 'ingreso' then 'NI-'
      when 'salida' then 'NS-'
      when 'retorno' then 'RT-'
      when 'traspaso' then 'TR-'
      when 'ajuste' then 'AJ-'
      when 'devolucion' then 'DEV-'
      when 'cobranza' then 'CB-'
    end
    || v_codigo || '-' || lpad(v_n::text, greatest(4, length(v_n::text)), '0');
end $$;

-- Un movimiento del libro mayor; los triggers ponen la regional, controlan el día y actualizan el saldo.
create function app.mover(
  p_fecha date, p_tipo text, p_almacen uuid, p_vendedor uuid, p_producto uuid, p_cantidad numeric,
  p_documento uuid, p_nota uuid, p_devolucion uuid
)
returns void language sql security definer set search_path = '' as $$
  insert into public.movimiento_inventario
    (fecha, tipo, almacen_id, vendedor_id, producto_id, cantidad, documento_id, nota_venta_id, devolucion_id, usuario_id)
  values (p_fecha, p_tipo, p_almacen, p_vendedor, p_producto, p_cantidad, p_documento, p_nota, p_devolucion, auth.uid());
$$;

-- Ítems [{producto_id, cantidad}] validados: al menos uno, sin repetidos, producto activo,
-- cantidad > 0 (o ≠ 0 con signo, para ajustes) y con 2 decimales como máximo.
create function app.leer_items(p_items jsonb, p_con_signo boolean default false)
returns table (producto_id uuid, cantidad numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_producto public.producto;
  v_vistos uuid[] := '{}';
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    perform app.error('VALIDACION', 'Agregue al menos un producto.', jsonb_build_object('campo', 'items', 'motivo', 'vacio'));
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      producto_id := (v_item ->> 'producto_id')::uuid;
      cantidad := (v_item ->> 'cantidad')::numeric;
    exception when others then
      producto_id := null;
    end;
    if producto_id is null or cantidad is null then
      perform app.error('VALIDACION', 'Hay un ítem sin producto o sin cantidad válida.', jsonb_build_object('campo', 'items', 'motivo', 'formato'));
    end if;
    if (p_con_signo and cantidad = 0) or (not p_con_signo and cantidad <= 0) or cantidad <> round(cantidad, 2) then
      perform app.error('VALIDACION',
        case when p_con_signo then 'La cantidad no puede ser 0.' else 'La cantidad debe ser mayor a 0.' end,
        jsonb_build_object('campo', 'cantidad', 'producto_id', producto_id, 'motivo', 'invalida'));
    end if;
    if producto_id = any (v_vistos) then
      perform app.error('VALIDACION', 'Un producto aparece dos veces: sume las cantidades en un solo ítem.',
        jsonb_build_object('campo', 'items', 'producto_id', producto_id, 'motivo', 'repetido'));
    end if;

    select * into v_producto from public.producto p where p.id = producto_id;
    if not found then
      perform app.error('NO_ENCONTRADO', 'Uno de los productos no existe.', jsonb_build_object('entidad', 'producto', 'id', producto_id));
    end if;
    if not v_producto.activo then
      perform app.error('REGISTRO_INACTIVO', format('El producto %s está inactivo.', v_producto.nombre),
        jsonb_build_object('entidad', 'producto', 'id', producto_id, 'nombre', v_producto.nombre));
    end if;

    v_vistos := v_vistos || producto_id;
    return next;
  end loop;
end $$;

-- Documentos de inventario -----------------------------------------------------------------

-- Núcleo de las 5 RPC: valida desde las filas reales (nunca desde parámetros derivados), controla
-- el día (en las dos regionales si es traspaso), numera, guarda el documento y mueve el stock.
create function app.registrar_documento(
  p_tipo text, p_almacen uuid, p_vendedor uuid, p_destino uuid, p_fecha date,
  p_referencia text, p_motivo text, p_items jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_almacen public.almacen;
  v_destino public.almacen;
  v_vendedor public.vendedor;
  v_doc public.documento_inventario;
  v_regional uuid;
  v_items jsonb := '[]';
  i record;
begin
  select * into v_almacen from public.almacen where id = p_almacen;
  if not found then
    perform app.error('NO_ENCONTRADO', 'El almacén no existe.', jsonb_build_object('entidad', 'almacen', 'id', p_almacen));
  end if;
  -- 1. permiso, sobre la regional real del almacén
  perform app.exigir_escritura(v_almacen.regional_id);
  if not v_almacen.activo then
    perform app.error('REGISTRO_INACTIVO', format('El almacén %s está inactivo.', v_almacen.nombre),
      jsonb_build_object('entidad', 'almacen', 'id', p_almacen, 'nombre', v_almacen.nombre));
  end if;

  if p_tipo in ('salida', 'retorno') then
    select * into v_vendedor from public.vendedor where id = p_vendedor;
    if not found then
      perform app.error('VALIDACION', 'Elija el vendedor.', jsonb_build_object('campo', 'vendedor_id', 'motivo', 'vacio'));
    end if;
    if v_vendedor.regional_id <> v_almacen.regional_id then
      perform app.error('VALIDACION', 'El vendedor no pertenece a la regional del almacén.',
        jsonb_build_object('campo', 'vendedor_id', 'motivo', 'otra_regional'));
    end if;
    if not v_vendedor.activo then
      perform app.error('REGISTRO_INACTIVO', format('El vendedor %s está inactivo.', v_vendedor.nombre),
        jsonb_build_object('entidad', 'vendedor', 'id', p_vendedor, 'nombre', v_vendedor.nombre));
    end if;
  end if;

  if p_tipo = 'traspaso' then
    select * into v_destino from public.almacen where id = p_destino;
    if not found then
      perform app.error('VALIDACION', 'Elija el almacén de destino.', jsonb_build_object('campo', 'almacen_destino_id', 'motivo', 'vacio'));
    end if;
    if v_destino.regional_id = v_almacen.regional_id then
      perform app.error('VALIDACION', 'El traspaso es hacia otra regional.',
        jsonb_build_object('campo', 'almacen_destino_id', 'motivo', 'misma_regional'));
    end if;
    if not v_destino.activo then
      perform app.error('REGISTRO_INACTIVO', format('El almacén %s está inactivo.', v_destino.nombre),
        jsonb_build_object('entidad', 'almacen', 'id', p_destino, 'nombre', v_destino.nombre));
    end if;
  end if;

  if p_tipo = 'ajuste' and nullif(btrim(p_motivo), '') is null then
    perform app.error('VALIDACION', 'El motivo del ajuste es obligatorio.', jsonb_build_object('campo', 'motivo', 'motivo', 'vacio'));
  end if;

  -- 2. día abierto; en un traspaso, en las dos regionales y siempre en el mismo orden (sin deadlocks
  --    entre traspasos cruzados LP→SCZ y SCZ→LP)
  for v_regional in
    select r from unnest(array[v_almacen.regional_id, v_destino.regional_id]) r where r is not null order by r
  loop
    perform app.asegurar_dia_abierto(v_regional, p_fecha);
  end loop;

  insert into public.documento_inventario
    (numero, tipo, regional_id, almacen_id, almacen_destino_id, vendedor_id, fecha, referencia, motivo, usuario_id)
  values (
    app.siguiente_numero(v_almacen.regional_id, p_tipo), p_tipo, v_almacen.regional_id, p_almacen,
    v_destino.id, v_vendedor.id, p_fecha, nullif(btrim(p_referencia), ''), nullif(btrim(p_motivo), ''), auth.uid()
  )
  returning * into v_doc;

  -- 3. ítems y movimientos (el trigger de saldo rechaza con STOCK_INSUFICIENTE)
  for i in select * from app.leer_items(p_items, p_tipo = 'ajuste') loop
    insert into public.documento_inventario_item (documento_id, producto_id, cantidad) values (v_doc.id, i.producto_id, i.cantidad);
    v_items := v_items || jsonb_build_object('producto_id', i.producto_id, 'cantidad', i.cantidad);

    case p_tipo
      when 'ingreso' then
        perform app.mover(p_fecha, 'ingreso', p_almacen, null, i.producto_id, i.cantidad, v_doc.id, null, null);
      when 'salida' then
        perform app.mover(p_fecha, 'salida', p_almacen, null, i.producto_id, -i.cantidad, v_doc.id, null, null);
        perform app.mover(p_fecha, 'salida', p_almacen, v_vendedor.id, i.producto_id, i.cantidad, v_doc.id, null, null);
      when 'retorno' then
        perform app.mover(p_fecha, 'retorno', p_almacen, v_vendedor.id, i.producto_id, -i.cantidad, v_doc.id, null, null);
        perform app.mover(p_fecha, 'retorno', p_almacen, null, i.producto_id, i.cantidad, v_doc.id, null, null);
      when 'traspaso' then
        perform app.mover(p_fecha, 'traspaso_salida', p_almacen, null, i.producto_id, -i.cantidad, v_doc.id, null, null);
        perform app.mover(p_fecha, 'traspaso_entrada', v_destino.id, null, i.producto_id, i.cantidad, v_doc.id, null, null);
      when 'ajuste' then
        perform app.mover(p_fecha, 'ajuste', p_almacen, null, i.producto_id, i.cantidad, v_doc.id, null, null);
    end case;
  end loop;

  -- 4. auditoría
  perform app.auditar('registrar_' || p_tipo, 'documento_inventario', v_doc.id::text, v_doc.regional_id,
    jsonb_strip_nulls(jsonb_build_object(
      'numero', v_doc.numero, 'fecha', p_fecha, 'vendedor_id', v_vendedor.id, 'almacen_destino_id', v_destino.id,
      'motivo', v_doc.motivo, 'items', v_items)));

  return jsonb_build_object('id', v_doc.id, 'numero', v_doc.numero);
end $$;

-- RPC públicas (firmas del Contrato §5.1) ---------------------------------------------------

create function public.registrar_ingreso(p_almacen_id uuid, p_fecha date, p_referencia text, p_items jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select app.registrar_documento('ingreso', p_almacen_id, null, null, p_fecha, p_referencia, null, p_items);
$$;

-- Solo para la modalidad "mercadería en poder del vendedor" (⚠ SUP-07).
create function public.registrar_salida(p_almacen_id uuid, p_vendedor_id uuid, p_fecha date, p_referencia text, p_items jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select app.registrar_documento('salida', p_almacen_id, p_vendedor_id, null, p_fecha, p_referencia, null, p_items);
$$;

create function public.registrar_retorno(p_almacen_id uuid, p_vendedor_id uuid, p_fecha date, p_referencia text, p_items jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select app.registrar_documento('retorno', p_almacen_id, p_vendedor_id, null, p_fecha, p_referencia, null, p_items);
$$;

create function public.registrar_traspaso(p_almacen_origen_id uuid, p_almacen_destino_id uuid, p_fecha date, p_referencia text, p_items jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select app.registrar_documento('traspaso', p_almacen_origen_id, null, p_almacen_destino_id, p_fecha, p_referencia, null, p_items);
$$;

-- Cantidades con signo; el motivo es obligatorio (inventario_inicial, conteo_fisico, merma, vencimiento, rotura…).
create function public.registrar_ajuste(p_almacen_id uuid, p_fecha date, p_motivo text, p_items jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select app.registrar_documento('ajuste', p_almacen_id, null, null, p_fecha, null, p_motivo, p_items);
$$;

revoke all on function
  public.registrar_ingreso(uuid, date, text, jsonb),
  public.registrar_salida(uuid, uuid, date, text, jsonb),
  public.registrar_retorno(uuid, uuid, date, text, jsonb),
  public.registrar_traspaso(uuid, uuid, date, text, jsonb),
  public.registrar_ajuste(uuid, date, text, jsonb)
  from public, anon;
grant execute on function
  public.registrar_ingreso(uuid, date, text, jsonb),
  public.registrar_salida(uuid, uuid, date, text, jsonb),
  public.registrar_retorno(uuid, uuid, date, text, jsonb),
  public.registrar_traspaso(uuid, uuid, date, text, jsonb),
  public.registrar_ajuste(uuid, date, text, jsonb)
  to authenticated;

revoke execute on all functions in schema app from public;
