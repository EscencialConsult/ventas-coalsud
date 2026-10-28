-- Devoluciones (Contrato de API §5.2, Reglas de Cálculo §4 y §5). BE-16.

-- Bloqueo de día: el N° de nota de crédito contable de una devolución se carga después, aunque el día
-- esté cerrado (no altera cantidades ni importes), igual que la factura de una nota (⚠ SUP-06).
create or replace function app.tg_bloqueo_dia()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c_factura constant text[] := array[
    'numero_factura', 'factura_pdf_path', 'factura_registrada_en', 'updated_at', 'fecha_vencimiento'
  ];
  v_regional uuid;
  v_cierre date;
  r public.regional;
begin
  if tg_op = 'UPDATE' and (
    (tg_table_name = 'nota_venta' and (to_jsonb(new) - c_factura) = (to_jsonb(old) - c_factura))
    or (tg_table_name = 'devolucion' and (to_jsonb(new) - 'nc_contable_numero') = (to_jsonb(old) - 'nc_contable_numero'))
  ) then
    return new;
  end if;

  -- en inventario regional_id lo pone tg_mov_set_regional, que corre después (orden alfabético)
  if tg_table_name in ('documento_inventario', 'movimiento_inventario') then
    select a.regional_id into v_regional from public.almacen a where a.id = new.almacen_id;
  else
    v_regional := new.regional_id;
  end if;

  v_cierre := app.ultimo_cierre(v_regional);
  if new.fecha <= v_cierre then
    select * into r from public.regional where id = v_regional;
    perform app.error('DIA_CERRADO',
      format('El día %s de %s está cerrado.', to_char(new.fecha, 'DD/MM/YYYY'), r.nombre),
      jsonb_build_object('regional', r.codigo, 'fecha', new.fecha, 'ultimo_cierre', v_cierre));
  end if;
  return new;
end $$;

-- Helpers ----------------------------------------------------------------------------------

-- Importe de una devolución, con el precio y el descuento de la nota original (Reglas §4).
create function app.importe_devolucion(p_devolucion uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(round(sum(di.cantidad * di.precio_aplicado) * (1 - n.descuento_pct / 100), 2), 0)
  from public.devolucion d
  join public.nota_venta n on n.id = d.nota_venta_id
  join public.devolucion_item di on di.devolucion_id = d.id
  where d.id = p_devolucion
  group by n.descuento_pct;
$$;

-- Cuenta de una nota: total, cobranzas vigentes, abonos, reembolsos y saldo (Reglas §1, §4, §5).
-- El saldo solo existe en una nota a crédito emitida.
create function app.cuenta_nota(p_nota uuid)
returns table (total numeric, cobrado numeric, abonado numeric, reembolsado numeric, saldo numeric)
language sql stable security definer set search_path = '' as $$
  with n as (select * from public.nota_venta where id = p_nota),
  t as (
    select round(coalesce(sum(i.subtotal), 0) * (1 - (select descuento_pct from n) / 100), 2) as total
    from public.nota_venta_item i where i.nota_venta_id = p_nota
  ),
  c as (select coalesce(sum(x.importe), 0) as cobrado from public.cobranza x where x.nota_venta_id = p_nota and x.estado = 'vigente'),
  d as (
    select
      coalesce(sum(app.importe_devolucion(dv.id)) filter (where dv.tipo_reverso = 'abono_cuenta'), 0) as abonado,
      coalesce(sum(app.importe_devolucion(dv.id)) filter (where dv.tipo_reverso = 'reembolso'), 0) as reembolsado
    from public.devolucion dv where dv.nota_venta_id = p_nota
  )
  select t.total, c.cobrado, d.abonado, d.reembolsado,
    case when (select estado from n) = 'emitida' and (select condicion_tipo from n) = 'credito'
      then t.total - c.cobrado - d.abonado else 0 end
  from t, c, d;
$$;

revoke execute on all functions in schema app from public;
grant execute on function app.importe_devolucion(uuid), app.cuenta_nota(uuid) to authenticated;

-- Lecturas ---------------------------------------------------------------------------------

-- Devoluciones con importe y nombres (⚙ DT-27).
create view public.v_devolucion with (security_invoker = true) as
select
  d.*,
  app.importe_devolucion(d.id) as importe,
  n.numero as nota_numero,
  n.cliente_id,
  c.nombre as cliente_nombre,
  app.nombre_usuario(d.usuario_id) as usuario_nombre
from public.devolucion d
join public.nota_venta n on n.id = d.nota_venta_id
join public.cliente c on c.id = n.cliente_id;

grant select on public.v_devolucion to authenticated;

-- Lo que todavía se puede devolver de una nota y los topes de abono y reembolso (⚙ DT-27).
create function public.max_devolvible(p_nota_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_nota public.nota_venta;
  v_cuenta record;
  v_items jsonb;
begin
  -- invoker: si la RLS no deja ver la nota, no existe
  select * into v_nota from public.nota_venta where id = p_nota_id;
  if not found then
    perform app.error('NO_ENCONTRADO', 'La nota no existe.', jsonb_build_object('entidad', 'nota_venta', 'id', p_nota_id));
  end if;

  select * into v_cuenta from app.cuenta_nota(p_nota_id);
  select jsonb_agg(jsonb_build_object(
      'producto_id', i.producto_id, 'producto', p.nombre, 'vendido', i.cantidad, 'devuelto', dev.devuelto,
      'maximo', i.cantidad - dev.devuelto, 'precio_aplicado', i.precio_aplicado)
    order by l.orden, p.orden)
  into v_items
  from public.nota_venta_item i
  join public.producto p on p.id = i.producto_id
  join public.linea_comercial l on l.id = p.linea_id
  cross join lateral (
    select coalesce(sum(di.cantidad), 0) as devuelto
    from public.devolucion_item di join public.devolucion d on d.id = di.devolucion_id
    where d.nota_venta_id = p_nota_id and di.producto_id = i.producto_id
  ) dev
  where i.nota_venta_id = p_nota_id;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'dia_cerrado', v_nota.fecha <= app.ultimo_cierre(v_nota.regional_id),
    'saldo', v_cuenta.saldo,
    'cobrado_neto', v_cuenta.cobrado - v_cuenta.reembolsado);
end $$;

-- Registrar devolución --------------------------------------------------------------------------
-- Solo sobre notas de días cerrados (antes: anulación). Fecha = hoy: repone el almacén hoy y, si es
-- reembolso, egresa de la caja de hoy; el día de la nota queda intacto (CP-06.9).
create function public.registrar_devolucion(p_nota_id uuid, p_tipo_reverso text, p_motivo text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_nota public.nota_venta;
  v_cuenta record;
  v_hoy date := app.hoy();
  v_devolucion public.devolucion;
  v_item jsonb;
  v_producto uuid;
  v_cantidad numeric;
  v_vendido public.nota_venta_item;
  v_devuelto numeric;
  v_vistos uuid[] := '{}';
  v_bruto numeric := 0;
  v_importe numeric;
  v_items jsonb := '[]';
  v_almacen uuid;
begin
  select * into v_nota from public.nota_venta where id = p_nota_id for update;
  if not found then
    perform app.error('NO_ENCONTRADO', 'La nota no existe.', jsonb_build_object('entidad', 'nota_venta', 'id', p_nota_id));
  end if;
  perform app.exigir_escritura(v_nota.regional_id);
  if v_nota.estado = 'anulada' then
    perform app.error('NOTA_ANULADA', format('La nota %s está anulada.', v_nota.numero), jsonb_build_object('numero', v_nota.numero));
  end if;
  if p_tipo_reverso is null or p_tipo_reverso not in ('reembolso', 'abono_cuenta') then
    perform app.error('VALIDACION', 'Elija reembolso o abono a cuenta.', jsonb_build_object('campo', 'tipo_reverso', 'motivo', 'invalido'));
  end if;
  if nullif(btrim(p_motivo), '') is null then
    perform app.error('VALIDACION', 'El motivo de la devolución es obligatorio.', jsonb_build_object('campo', 'motivo', 'motivo', 'vacio'));
  end if;
  if v_nota.fecha > app.ultimo_cierre(v_nota.regional_id) then
    perform app.error('DEVOLUCION_DIA_ABIERTO', format('El día de la nota %s sigue abierto: anúlela en lugar de devolver.', v_nota.numero),
      jsonb_build_object('fecha_nota', v_nota.fecha));
  end if;

  -- hoy abierto en la regional de la nota (DIA_CERRADO si ya se cerró)
  perform app.asegurar_dia_abierto(v_nota.regional_id, v_hoy);

  -- ítems: de la nota, sin repetidos, hasta lo vendido menos lo ya devuelto (un producto hoy inactivo se devuelve igual)
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    perform app.error('VALIDACION', 'Agregue al menos un producto.', jsonb_build_object('campo', 'items', 'motivo', 'vacio'));
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_producto := (v_item ->> 'producto_id')::uuid;
      v_cantidad := (v_item ->> 'cantidad')::numeric;
    exception when others then
      v_producto := null;
    end;
    if v_producto is null or v_cantidad is null or v_cantidad <= 0 or v_cantidad <> round(v_cantidad, 2) then
      perform app.error('VALIDACION', 'Hay un ítem sin producto o con una cantidad inválida.', jsonb_build_object('campo', 'items', 'motivo', 'formato'));
    end if;
    if v_producto = any (v_vistos) then
      perform app.error('VALIDACION', 'Un producto aparece dos veces.', jsonb_build_object('campo', 'items', 'producto_id', v_producto, 'motivo', 'repetido'));
    end if;
    select * into v_vendido from public.nota_venta_item where nota_venta_id = v_nota.id and producto_id = v_producto;
    if not found then
      perform app.error('VALIDACION', 'Ese producto no está en la nota.', jsonb_build_object('campo', 'items', 'producto_id', v_producto, 'motivo', 'no_vendido'));
    end if;
    select coalesce(sum(di.cantidad), 0) into v_devuelto
    from public.devolucion_item di join public.devolucion d on d.id = di.devolucion_id
    where d.nota_venta_id = v_nota.id and di.producto_id = v_producto;
    if v_cantidad > v_vendido.cantidad - v_devuelto then
      perform app.error('DEVOLUCION_EXCEDE', format('Se puede devolver hasta %s.', trim_scale(v_vendido.cantidad - v_devuelto)),
        jsonb_build_object('producto_id', v_producto, 'maximo', v_vendido.cantidad - v_devuelto));
    end if;

    v_vistos := v_vistos || v_producto;
    v_bruto := v_bruto + v_cantidad * v_vendido.precio_aplicado;
    v_items := v_items || jsonb_build_object('producto_id', v_producto, 'cantidad', v_cantidad, 'precio_aplicado', v_vendido.precio_aplicado);
  end loop;

  -- importe con el descuento de la nota, y topes de abono y reembolso (Reglas §4)
  v_importe := round(v_bruto * (1 - v_nota.descuento_pct / 100), 2);
  select * into v_cuenta from app.cuenta_nota(v_nota.id);
  if p_tipo_reverso = 'abono_cuenta' and (v_nota.condicion_tipo <> 'credito' or v_importe > v_cuenta.saldo) then
    perform app.error('ABONO_NO_PERMITIDO',
      case when v_nota.condicion_tipo <> 'credito' then 'Una nota al contado no admite abono a cuenta: use reembolso.'
           else format('El abono (%s) supera el saldo de la nota (%s).', v_importe, v_cuenta.saldo) end,
      jsonb_build_object('saldo', v_cuenta.saldo));
  end if;
  if p_tipo_reverso = 'reembolso' and v_nota.condicion_tipo = 'credito' and v_importe > v_cuenta.cobrado - v_cuenta.reembolsado then
    perform app.error('REEMBOLSO_EXCEDE_COBRADO',
      format('No se puede reembolsar %s: de esta nota se cobraron %s.', v_importe, v_cuenta.cobrado - v_cuenta.reembolsado),
      jsonb_build_object('cobrado_neto', v_cuenta.cobrado - v_cuenta.reembolsado));
  end if;

  -- devolución, ítems y stock: almacén +q hoy (⚠ SUP-16)
  insert into public.devolucion (numero, regional_id, fecha, nota_venta_id, tipo_reverso, motivo, usuario_id)
  values (app.siguiente_numero(v_nota.regional_id, 'devolucion'), v_nota.regional_id, v_hoy, v_nota.id, p_tipo_reverso, btrim(p_motivo), auth.uid())
  returning * into v_devolucion;

  v_almacen := app.almacen_principal(v_nota.regional_id);
  for v_item in select * from jsonb_array_elements(v_items) loop
    insert into public.devolucion_item (devolucion_id, producto_id, cantidad, precio_aplicado)
    values (v_devolucion.id, (v_item ->> 'producto_id')::uuid, (v_item ->> 'cantidad')::numeric, (v_item ->> 'precio_aplicado')::numeric);
    perform app.mover(v_hoy, 'devolucion', v_almacen, null, (v_item ->> 'producto_id')::uuid, (v_item ->> 'cantidad')::numeric, null, null, v_devolucion.id);
  end loop;

  perform app.auditar('registrar_devolucion', 'devolucion', v_devolucion.id::text, v_nota.regional_id, jsonb_build_object(
    'numero', v_devolucion.numero, 'nota', v_nota.numero, 'tipo_reverso', p_tipo_reverso, 'importe', v_importe, 'items', v_items));

  return jsonb_build_object('id', v_devolucion.id, 'numero', v_devolucion.numero, 'importe', v_importe);
end $$;

-- N° de la nota de crédito que emitió Contabilidad; se permite con el día cerrado.
create function public.registrar_nc_contable(p_devolucion_id uuid, p_numero text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_devolucion public.devolucion;
  v_numero text := nullif(btrim(p_numero), '');
begin
  select * into v_devolucion from public.devolucion where id = p_devolucion_id for update;
  if not found then
    perform app.error('NO_ENCONTRADO', 'La devolución no existe.', jsonb_build_object('entidad', 'devolucion', 'id', p_devolucion_id));
  end if;
  perform app.exigir_escritura(v_devolucion.regional_id);
  if v_numero is null or length(v_numero) > 30 then
    perform app.error('VALIDACION', 'El N° de nota de crédito es obligatorio (hasta 30 caracteres).',
      jsonb_build_object('campo', 'nc_contable_numero', 'motivo', 'invalido'));
  end if;

  update public.devolucion set nc_contable_numero = v_numero where id = v_devolucion.id;
  perform app.auditar('registrar_nc_contable', 'devolucion', v_devolucion.id::text, v_devolucion.regional_id, jsonb_build_object(
    'antes', jsonb_build_object('nc_contable_numero', v_devolucion.nc_contable_numero),
    'despues', jsonb_build_object('nc_contable_numero', v_numero)));
  return jsonb_build_object('id', v_devolucion.id, 'nc_contable_numero', v_numero);
end $$;

revoke all on function
  public.max_devolvible(uuid),
  public.registrar_devolucion(uuid, text, text, jsonb),
  public.registrar_nc_contable(uuid, text)
  from public, anon;
grant execute on function
  public.max_devolvible(uuid),
  public.registrar_devolucion(uuid, text, text, jsonb),
  public.registrar_nc_contable(uuid, text)
  to authenticated;
