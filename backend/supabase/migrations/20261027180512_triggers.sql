-- Triggers de integridad (Esquema BD §4). El de auditoría de maestros va con BE-10.
-- Las funciones son security definer: se comportan igual si escribe una RPC o un maestro directo con RLS.

-- updated_at -------------------------------------------------------------------------------

create function app.tg_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger tg_set_updated_at before update on public.regional for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.usuario for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.vendedor for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.almacen for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.linea_comercial for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.producto for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.condicion_pago for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.cliente for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.nota_venta for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.liquidacion for each row execute function app.tg_set_updated_at();
create trigger tg_set_updated_at before update on public.presupuesto for each row execute function app.tg_set_updated_at();

-- Inmutabilidad ----------------------------------------------------------------------------

create function app.tg_inmutable()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- reabrir_liquidacion borra el snapshot del día (variable de sesión app.reabriendo)
  if tg_table_name = 'liquidacion_linea' and tg_op = 'DELETE'
     and current_setting('app.reabriendo', true) = 'on' then
    return old;
  end if;
  perform app.error('INMUTABLE', 'Este registro no se puede modificar ni borrar.',
    jsonb_build_object('tabla', tg_table_name));
  return null;
end $$;

create trigger tg_inmutable before update or delete on public.nota_venta_item for each row execute function app.tg_inmutable();
create trigger tg_inmutable before update or delete on public.movimiento_inventario for each row execute function app.tg_inmutable();
create trigger tg_inmutable before update or delete on public.documento_inventario for each row execute function app.tg_inmutable();
create trigger tg_inmutable before update or delete on public.documento_inventario_item for each row execute function app.tg_inmutable();
create trigger tg_inmutable before update or delete on public.devolucion_item for each row execute function app.tg_inmutable();
create trigger tg_inmutable before update or delete on public.auditoria for each row execute function app.tg_inmutable();
create trigger tg_inmutable before update or delete on public.liquidacion_linea for each row execute function app.tg_inmutable();

-- Una nota emitida solo se anula o recibe su factura.
create function app.tg_nota_inmutable()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- fecha_vencimiento es generada: en un BEFORE llega nula, no se compara
  c_libres constant text[] := array[
    'numero_factura', 'factura_pdf_path', 'factura_registrada_en', 'updated_at',
    'estado', 'motivo_anulacion', 'anulada_por', 'anulada_en', 'fecha_vencimiento'
  ];
  v_anula boolean := old.estado = 'emitida' and new.estado = 'anulada';
begin
  if (to_jsonb(new) - c_libres) is distinct from (to_jsonb(old) - c_libres)
     or (new.estado is distinct from old.estado and not v_anula)
     or (not v_anula and (new.motivo_anulacion, new.anulada_por, new.anulada_en)
                         is distinct from (old.motivo_anulacion, old.anulada_por, old.anulada_en)) then
    perform app.error('INMUTABLE', 'Una nota emitida no se edita: solo se anula o se le registra la factura.',
      jsonb_build_object('nota_venta_id', old.id));
  end if;
  return new;
end $$;

create trigger tg_nota_inmutable before update on public.nota_venta for each row execute function app.tg_nota_inmutable();

-- Inventario -------------------------------------------------------------------------------

-- La regional sale del almacén, nunca del cliente (⚙ DT-05).
create function app.tg_mov_set_regional()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select a.regional_id into new.regional_id from public.almacen a where a.id = new.almacen_id;
  return new;
end $$;

create trigger tg_mov_set_regional before insert on public.documento_inventario for each row execute function app.tg_mov_set_regional();
create trigger tg_mov_set_regional before insert on public.movimiento_inventario for each row execute function app.tg_mov_set_regional();

-- Único camino por el que cambia stock_saldo (⚙ DT-04).
create function app.tg_mov_actualiza_saldo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_disponible numeric(14,2);
  v_producto text;
begin
  -- Solo las entradas usan upsert: Postgres valida el CHECK de la fila propuesta antes de
  -- detectar el conflicto, así que una salida (negativa) fallaría aunque haya saldo.
  if new.cantidad > 0 then
    insert into public.stock_saldo as s (almacen_id, vendedor_id, producto_id, regional_id, cantidad)
    values (new.almacen_id, new.vendedor_id, new.producto_id, new.regional_id, new.cantidad)
    on conflict (almacen_id, vendedor_id, producto_id)
    do update set cantidad = s.cantidad + excluded.cantidad, updated_at = now();
  else
    update public.stock_saldo s set cantidad = s.cantidad + new.cantidad, updated_at = now()
    where s.almacen_id = new.almacen_id and s.producto_id = new.producto_id
      and s.vendedor_id is not distinct from new.vendedor_id;
    if not found then
      raise check_violation;  -- sin saldo previo: disponible 0
    end if;
  end if;
  return null;
exception when check_violation then
  select coalesce(sum(s.cantidad), 0) into v_disponible
  from public.stock_saldo s
  where s.almacen_id = new.almacen_id and s.vendedor_id is not distinct from new.vendedor_id
    and s.producto_id = new.producto_id;
  select p.nombre into v_producto from public.producto p where p.id = new.producto_id;
  perform app.error('STOCK_INSUFICIENTE',
    format('No alcanza el stock de %s: disponible %s.', v_producto, trim_scale(v_disponible)),
    jsonb_build_object(
      'producto_id', new.producto_id, 'producto', v_producto,
      'disponible', v_disponible, 'solicitado', -new.cantidad,
      'ubicacion', case when new.vendedor_id is null then 'almacen' else 'vendedor' end
    ));
  return null;
end $$;

create trigger tg_mov_actualiza_saldo after insert on public.movimiento_inventario for each row execute function app.tg_mov_actualiza_saldo();

-- Bloqueo de día cerrado (RF33): defensa en profundidad de app.asegurar_dia_abierto.
-- Bloquea toda fecha <= último cierre, no solo la que tiene fila cerrada (Reglas de Cálculo §11).
create function app.tg_bloqueo_dia()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c_factura constant text[] := array[
    'numero_factura', 'factura_pdf_path', 'factura_registrada_en', 'updated_at', 'fecha_vencimiento'
  ];
  v_regional uuid;
  v_cierre date;
  r public.regional;
begin
  -- la factura no altera cantidades ni importes: se registra aunque el día esté cerrado (⚠ SUP-06)
  if tg_table_name = 'nota_venta' and tg_op = 'UPDATE'
     and (to_jsonb(new) - c_factura) = (to_jsonb(old) - c_factura) then
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

create trigger tg_bloqueo_dia before insert or update on public.nota_venta for each row execute function app.tg_bloqueo_dia();
create trigger tg_bloqueo_dia before insert or update on public.cobranza for each row execute function app.tg_bloqueo_dia();
create trigger tg_bloqueo_dia before insert or update on public.devolucion for each row execute function app.tg_bloqueo_dia();
create trigger tg_bloqueo_dia before insert or update on public.documento_inventario for each row execute function app.tg_bloqueo_dia();
create trigger tg_bloqueo_dia before insert or update on public.movimiento_inventario for each row execute function app.tg_bloqueo_dia();

-- Usuarios ---------------------------------------------------------------------------------

create function app.tg_ultimo_nacional()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.rol = 'nacional' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'nacional' or not new.activo) then
    -- bloquea a los nacionales activos: dos bajas simultáneas no pueden dejar 0
    perform 1 from public.usuario u where u.rol = 'nacional' and u.activo for update;
    if not exists (
      select 1 from public.usuario u where u.rol = 'nacional' and u.activo and u.id <> old.id
    ) then
      perform app.error('ULTIMO_NACIONAL', 'Debe quedar al menos un usuario nacional activo.');
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger tg_ultimo_nacional before update or delete on public.usuario for each row execute function app.tg_ultimo_nacional();

-- El nacional ve todas las regionales sin filas; solo el rol regional se asigna.
create function app.tg_usuario_regional_rol()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.usuario u where u.id = new.usuario_id and u.rol = 'regional') then
    perform app.error('VALIDACION', 'Solo los usuarios regionales se asignan a regionales.',
      jsonb_build_object('campo', 'regionales', 'motivo', 'rol_no_regional'));
  end if;
  return new;
end $$;

create trigger tg_usuario_regional_rol before insert or update on public.usuario_regional for each row execute function app.tg_usuario_regional_rol();

-- Maestros ---------------------------------------------------------------------------------

create function app.tg_cliente_vendedor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.vendedor_id is not null and not exists (
    select 1 from public.vendedor v where v.id = new.vendedor_id and v.regional_id = new.regional_id
  ) then
    perform app.error('VALIDACION', 'El vendedor no pertenece a la regional del cliente.',
      jsonb_build_object('campo', 'vendedor_id', 'motivo', 'otra_regional'));
  end if;
  return new;
end $$;

create trigger tg_cliente_vendedor before insert or update of vendedor_id, regional_id on public.cliente
  for each row execute function app.tg_cliente_vendedor();

create function app.tg_vendedor_baja()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_productos jsonb;
begin
  if old.activo and not new.activo then
    select jsonb_agg(jsonb_build_object('producto_id', p.id, 'producto', p.nombre, 'cantidad', s.cantidad) order by p.nombre)
    into v_productos
    from public.stock_saldo s
    join public.producto p on p.id = s.producto_id
    where s.vendedor_id = new.id and s.cantidad > 0;

    if v_productos is not null then
      perform app.error('VENDEDOR_CON_SALDO',
        format('%s todavía tiene mercadería en su poder: registre el retorno antes de desactivarlo.', new.nombre),
        jsonb_build_object('productos', v_productos));
    end if;
  end if;
  return new;
end $$;

create trigger tg_vendedor_baja before update of activo on public.vendedor for each row execute function app.tg_vendedor_baja();

-- El código es el prefijo de la numeración: no cambia una vez que hay documentos.
create function app.tg_regional_codigo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.codigo <> old.codigo
     and exists (select 1 from public.correlativo c where c.regional_id = old.id and c.ultimo > 0) then
    perform app.error('VALIDACION', format('No se puede cambiar el código de %s: ya tiene documentos numerados.', old.nombre),
      jsonb_build_object('campo', 'codigo', 'motivo', 'con_documentos'));
  end if;
  return new;
end $$;

create trigger tg_regional_codigo before update of codigo on public.regional for each row execute function app.tg_regional_codigo();

revoke execute on all functions in schema app from public;
