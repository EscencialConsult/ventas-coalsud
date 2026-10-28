-- Emisión de notas de venta (Contrato de API §5.2, Reglas de Cálculo §1). BE-13.

-- Helpers ----------------------------------------------------------------------------------

-- Almacén del que descuenta la nota: el activo más antiguo de la regional (hoy hay uno por regional;
-- la nota no elige almacén en el contrato).
create function app.almacen_principal(p_regional uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  select a.id into v_id from public.almacen a
  where a.regional_id = p_regional and a.activo
  order by a.created_at, a.id
  limit 1;
  if v_id is null then
    perform app.error('VALIDACION', 'La regional no tiene un almacén activo.', jsonb_build_object('campo', 'regional_id', 'motivo', 'sin_almacen'));
  end if;
  return v_id;
end $$;

-- Ítems de una nota [{producto_id, cantidad, precio_aplicado}]: lo de leer_items (producto activo, sin
-- repetidos, cantidad > 0) más el precio aplicado (≥ 0, 2 decimales) y la foto del precio de catálogo.
create function app.leer_items_nota(p_items jsonb)
returns table (producto_id uuid, producto text, cantidad numeric, precio_base numeric, precio_aplicado numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_precio numeric;
begin
  for producto_id, cantidad in select l.producto_id, l.cantidad from app.leer_items(p_items) l loop
    begin
      select (e ->> 'precio_aplicado')::numeric into v_precio
      from jsonb_array_elements(p_items) e
      where (e ->> 'producto_id')::uuid = producto_id;
    exception when others then
      v_precio := null;
    end;
    if v_precio is null or v_precio < 0 or v_precio <> round(v_precio, 2) then
      perform app.error('VALIDACION', 'El precio debe ser 0 o mayor, con 2 decimales como máximo.',
        jsonb_build_object('campo', 'precio_aplicado', 'producto_id', producto_id, 'motivo', 'invalido'));
    end if;
    select p.nombre, p.precio_base into producto, precio_base from public.producto p where p.id = producto_id;
    precio_aplicado := v_precio;
    return next;
  end loop;
end $$;

-- Emitir nota ------------------------------------------------------------------------------

create function public.emitir_nota_venta(
  p_regional_id uuid, p_fecha date, p_cliente_id uuid, p_vendedor_id uuid, p_canal text,
  p_condicion_pago_id uuid, p_descuento_pct numeric, p_origen_stock text, p_numero_factura text,
  p_observaciones text, p_items jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cliente public.cliente;
  v_vendedor public.vendedor;
  v_condicion public.condicion_pago;
  v_nota public.nota_venta;
  v_origen text := coalesce(nullif(btrim(p_origen_stock), ''), 'almacen');
  v_descuento numeric := coalesce(p_descuento_pct, 0);
  v_factura text := nullif(btrim(p_numero_factura), '');
  v_almacen uuid;
  v_almacen_item uuid;
  v_bruto numeric;
  v_total numeric;
  i record;
begin
  -- 1. permiso sobre la regional de la nota
  perform app.exigir_escritura(p_regional_id);

  -- 2. cliente, vendedor y condición: activos y de la regional
  select * into v_cliente from public.cliente where id = p_cliente_id;
  if not found then
    perform app.error('VALIDACION', 'Elija el cliente.', jsonb_build_object('campo', 'cliente_id', 'motivo', 'vacio'));
  end if;
  if v_cliente.regional_id <> p_regional_id then
    perform app.error('VALIDACION', 'El cliente no es de esta regional.', jsonb_build_object('campo', 'cliente_id', 'motivo', 'otra_regional'));
  end if;
  if not v_cliente.activo then
    perform app.error('REGISTRO_INACTIVO', format('El cliente %s está inactivo.', v_cliente.nombre),
      jsonb_build_object('entidad', 'cliente', 'id', v_cliente.id, 'nombre', v_cliente.nombre));
  end if;

  select * into v_vendedor from public.vendedor where id = p_vendedor_id;
  if not found then
    perform app.error('VALIDACION', 'Elija el vendedor.', jsonb_build_object('campo', 'vendedor_id', 'motivo', 'vacio'));
  end if;
  if v_vendedor.regional_id <> p_regional_id then
    perform app.error('VALIDACION', 'El vendedor no es de esta regional.', jsonb_build_object('campo', 'vendedor_id', 'motivo', 'otra_regional'));
  end if;
  if not v_vendedor.activo then
    perform app.error('REGISTRO_INACTIVO', format('El vendedor %s está inactivo.', v_vendedor.nombre),
      jsonb_build_object('entidad', 'vendedor', 'id', v_vendedor.id, 'nombre', v_vendedor.nombre));
  end if;

  -- sin condición elegida, la del cliente
  select * into v_condicion from public.condicion_pago where id = coalesce(p_condicion_pago_id, v_cliente.condicion_pago_id);
  if not v_condicion.activo then
    perform app.error('REGISTRO_INACTIVO', format('La condición de pago %s está inactiva.', v_condicion.nombre),
      jsonb_build_object('entidad', 'condicion_pago', 'id', v_condicion.id, 'nombre', v_condicion.nombre));
  end if;

  if v_descuento < 0 or v_descuento > 100 then
    perform app.error('VALIDACION', 'El descuento debe estar entre 0 y 100 %.', jsonb_build_object('campo', 'descuento_pct', 'motivo', 'rango'));
  end if;
  if v_origen not in ('almacen', 'vendedor') then
    perform app.error('VALIDACION', 'El origen del stock debe ser el almacén o el saldo del vendedor.',
      jsonb_build_object('campo', 'origen_stock', 'motivo', 'invalido'));
  end if;

  -- 3. día abierto
  perform app.asegurar_dia_abierto(p_regional_id, p_fecha);
  v_almacen := app.almacen_principal(p_regional_id);

  -- 4. nota, con la foto de la condición (tipo y días)
  insert into public.nota_venta (
    numero, regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, dias_credito,
    descuento_pct, origen_stock, numero_factura, factura_registrada_en, observaciones, usuario_id
  ) values (
    app.siguiente_numero(p_regional_id, 'nota_venta'), p_regional_id, p_fecha, v_cliente.id, v_vendedor.id,
    coalesce(nullif(btrim(p_canal), ''), v_cliente.canal), v_condicion.id, v_condicion.tipo, v_condicion.dias,
    v_descuento, v_origen, v_factura, case when v_factura is not null then now() end,
    nullif(btrim(p_observaciones), ''), auth.uid()
  )
  returning * into v_nota;

  -- 5. ítems con la foto del precio de catálogo, y el stock: almacén o saldo del vendedor (⚠ SUP-14)
  for i in select * from app.leer_items_nota(p_items) loop
    insert into public.nota_venta_item (nota_venta_id, producto_id, cantidad, precio_base, precio_aplicado)
    values (v_nota.id, i.producto_id, i.cantidad, i.precio_base, i.precio_aplicado);

    if v_origen = 'vendedor' then
      -- el saldo del vendedor está en el almacén desde el que se le entregó
      select coalesce(
        (select s.almacen_id from public.stock_saldo s
         where s.vendedor_id = v_vendedor.id and s.producto_id = i.producto_id
         order by s.cantidad desc limit 1),
        v_almacen) into v_almacen_item;
      perform app.mover(p_fecha, 'venta', v_almacen_item, v_vendedor.id, i.producto_id, -i.cantidad, null, v_nota.id, null);
    else
      perform app.mover(p_fecha, 'venta', v_almacen, null, i.producto_id, -i.cantidad, null, v_nota.id, null);
    end if;

    if i.precio_aplicado <> i.precio_base then
      perform app.auditar('cambio_precio', 'nota_venta', v_nota.id::text, p_regional_id,
        jsonb_build_object('producto_id', i.producto_id, 'producto', i.producto, 'antes', i.precio_base, 'despues', i.precio_aplicado));
    end if;
  end loop;

  -- 6. totales (Reglas §1) y auditoría
  select sum(it.subtotal) into v_bruto from public.nota_venta_item it where it.nota_venta_id = v_nota.id;
  v_total := round(v_bruto * (1 - v_descuento / 100), 2);

  perform app.auditar('emitir_nota', 'nota_venta', v_nota.id::text, p_regional_id,
    jsonb_build_object('despues', jsonb_build_object(
      'numero', v_nota.numero, 'cliente', v_cliente.nombre, 'total', v_total,
      'condicion', v_condicion.nombre, 'origen_stock', v_origen)));
  if v_descuento > 0 then
    perform app.auditar('descuento', 'nota_venta', v_nota.id::text, p_regional_id,
      jsonb_build_object('descuento_pct', v_descuento, 'bruto', v_bruto, 'descuento_bs', v_bruto - v_total, 'total', v_total));
  end if;

  return jsonb_build_object('id', v_nota.id, 'numero', v_nota.numero, 'bruto', v_bruto, 'descuento_bs', v_bruto - v_total, 'total', v_total);
end $$;

revoke all on function public.emitir_nota_venta(uuid, date, uuid, uuid, text, uuid, numeric, text, text, text, jsonb) from public, anon;
grant execute on function public.emitir_nota_venta(uuid, date, uuid, uuid, text, uuid, numeric, text, text, text, jsonb) to authenticated;

revoke execute on all functions in schema app from public;
