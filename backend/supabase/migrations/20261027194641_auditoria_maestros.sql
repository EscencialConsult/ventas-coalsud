-- Auditoría de maestros por trigger (Esquema BD §4, Seguridad RLS §8).
-- Acciones: crear · editar · desactivar · reactivar · cambio_precio_base (cambia el precio de lista de un producto).
-- datos: crear → {despues: fila}; resto → {antes, despues} solo con las columnas que cambiaron.

create function app.tg_auditar_maestro()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nuevo jsonb := to_jsonb(new);
  v_viejo jsonb;
  v_antes jsonb;
  v_despues jsonb;
  v_accion text;
begin
  if tg_op = 'INSERT' then
    v_accion := 'crear';
    v_despues := v_nuevo - array['created_at', 'updated_at'];
  else
    v_viejo := to_jsonb(old);
    select jsonb_object_agg(k, v_viejo -> k), jsonb_object_agg(k, v_nuevo -> k)
      into v_antes, v_despues
    from jsonb_object_keys(v_nuevo) k
    where k <> 'updated_at' and v_nuevo -> k is distinct from v_viejo -> k;

    -- un update sin cambios reales no se audita
    if v_antes is null then
      return null;
    end if;

    -- activo por jsonb: presupuesto no tiene esa columna
    v_accion := case
      when (v_viejo ->> 'activo')::boolean and not (v_nuevo ->> 'activo')::boolean then 'desactivar'
      when not (v_viejo ->> 'activo')::boolean and (v_nuevo ->> 'activo')::boolean then 'reactivar'
      when tg_table_name = 'producto' and v_antes ? 'precio_base' then 'cambio_precio_base'
      else 'editar'
    end;
  end if;

  insert into public.auditoria (usuario_id, regional_id, accion, entidad, entidad_id, datos)
  values (
    auth.uid(),
    case when tg_table_name = 'regional' then new.id else (v_nuevo ->> 'regional_id')::uuid end,
    v_accion,
    tg_table_name,
    new.id::text,
    case when v_antes is null then jsonb_build_object('despues', v_despues)
         else jsonb_build_object('antes', v_antes, 'despues', v_despues) end
  );
  return null;
end $$;

create trigger tg_auditar_maestro after insert or update on public.regional for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.almacen for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.linea_comercial for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.producto for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.condicion_pago for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.cliente for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.vendedor for each row execute function app.tg_auditar_maestro();
create trigger tg_auditar_maestro after insert or update on public.presupuesto for each row execute function app.tg_auditar_maestro();

revoke execute on all functions in schema app from public;
