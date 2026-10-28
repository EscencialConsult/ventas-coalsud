-- Sesión y perfil (Contrato de API §3) y escrituras de usuarios para la Edge Function admin-usuarios (§8).

-- Sesión -----------------------------------------------------------------------------------

-- Perfil de la sesión. Un usuario desactivado recibe su perfil con activo = false (y sin regionales):
-- el frontend cierra la sesión y muestra USUARIO_INACTIVO.
create function public.mi_perfil()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_perfil jsonb;
begin
  select jsonb_build_object(
    'id', u.id, 'nombre', u.nombre, 'email', u.email, 'rol', u.rol, 'activo', u.activo,
    'debe_cambiar_password', u.debe_cambiar_password,
    -- el nacional recibe todas las regionales; el regional, las suyas
    'regionales', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'codigo', r.codigo, 'nombre', r.nombre) order by r.nombre)
      from public.regional r
      where u.activo and r.activo
        and (u.rol = 'nacional' or exists (
          select 1 from public.usuario_regional ur where ur.usuario_id = u.id and ur.regional_id = r.id))
    ), '[]'::jsonb)
  )
  into v_perfil
  from public.usuario u
  where u.id = auth.uid();

  if v_perfil is null then
    perform app.error('NO_AUTORIZADO', 'Su cuenta no tiene un perfil en el sistema. Consulte al administrador.');
  end if;
  return v_perfil;
end $$;

-- Fecha de hoy en Bolivia según la base, para los defaults de los formularios (RNF-29).
create function public.hoy()
returns date language sql stable security definer set search_path = '' as $$
  select app.hoy();
$$;

-- Cierra el cambio obligatorio de contraseña (el cambio en sí lo hace auth.updateUser).
create function public.marcar_password_cambiado()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.exigir_activo();
  update public.usuario set debe_cambiar_password = false where id = auth.uid();
end $$;

revoke all on function public.mi_perfil(), public.hoy(), public.marcar_password_cambiado() from public, anon;
grant execute on function public.mi_perfil(), public.hoy(), public.marcar_password_cambiado() to authenticated;

-- Helpers de usuarios ----------------------------------------------------------------------

-- Usuario como lo devuelve admin-usuarios (Contrato §8).
create function app.usuario_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id, 'nombre', u.nombre, 'email', u.email, 'rol', u.rol, 'activo', u.activo,
    'debe_cambiar_password', u.debe_cambiar_password,
    'regionales', coalesce((
      select jsonb_agg(ur.regional_id order by ur.regional_id) from public.usuario_regional ur where ur.usuario_id = u.id
    ), '[]'::jsonb)
  )
  from public.usuario u
  where u.id = p_id;
$$;

-- El regional opera al menos una regional; el nacional no se asigna porque ve todas (CP-01.5).
create function app.validar_rol_regionales(p_rol text, p_regionales uuid[])
returns void language plpgsql set search_path = '' as $$
begin
  if p_rol is null or p_rol not in ('nacional', 'regional') then
    perform app.error('VALIDACION', 'El rol debe ser nacional o regional.',
      jsonb_build_object('campo', 'rol', 'motivo', 'invalido'));
  end if;
  if p_rol = 'regional' and coalesce(cardinality(p_regionales), 0) = 0 then
    perform app.error('VALIDACION', 'Un usuario regional necesita al menos una regional.',
      jsonb_build_object('campo', 'regionales', 'motivo', 'vacio'));
  end if;
  if p_rol = 'nacional' and coalesce(cardinality(p_regionales), 0) > 0 then
    perform app.error('VALIDACION', 'El usuario nacional ve todas las regionales: no se le asignan.',
      jsonb_build_object('campo', 'regionales', 'motivo', 'nacional'));
  end if;
end $$;

create function app.asignar_regionales(p_usuario uuid, p_regionales uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.usuario_regional where usuario_id = p_usuario;
  insert into public.usuario_regional (usuario_id, regional_id)
  select distinct p_usuario, r from unnest(coalesce(p_regionales, '{}')) r;
exception when foreign_key_violation then
  perform app.error('VALIDACION', 'Alguna de las regionales elegidas no existe.',
    jsonb_build_object('campo', 'regionales', 'motivo', 'inexistente'));
end $$;

-- Auditoría a nombre del nacional que actúa: la Edge Function llama con service_role (auth.uid() es nulo).
create function app.auditar_usuario(p_actor uuid, p_accion text, p_usuario uuid, p_datos jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (usuario_id, accion, entidad, entidad_id, datos)
  values (p_actor, p_accion, 'usuario', p_usuario::text, p_datos);
$$;

-- RPC de admin-usuarios (solo service_role) ------------------------------------------------
-- Cada una es una transacción: perfil + regionales + auditoría. La cuenta de auth la maneja la Edge Function.

create function public.admin_crear_usuario(
  p_actor uuid, p_id uuid, p_nombre text, p_email text, p_rol text, p_regionales uuid[]
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_usuario jsonb;
begin
  perform app.validar_rol_regionales(p_rol, p_regionales);
  if nullif(btrim(p_nombre), '') is null then
    perform app.error('VALIDACION', 'El nombre es obligatorio.', jsonb_build_object('campo', 'nombre', 'motivo', 'vacio'));
  end if;

  insert into public.usuario (id, nombre, email, rol) values (p_id, btrim(p_nombre), lower(btrim(p_email)), p_rol);
  perform app.asignar_regionales(p_id, p_regionales);

  v_usuario := app.usuario_json(p_id);
  perform app.auditar_usuario(p_actor, 'crear_usuario', p_id, jsonb_build_object('despues', v_usuario));
  return v_usuario;
exception when unique_violation then
  perform app.error('DUPLICADO', 'Ya existe un usuario con ese correo.', jsonb_build_object('campo', 'email'));
end $$;

-- Campos nulos = sin cambio. Pasar a nacional sin indicar regionales le quita las que tenía.
create function public.admin_actualizar_usuario(
  p_actor uuid, p_id uuid, p_nombre text default null, p_rol text default null, p_regionales uuid[] default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_antes jsonb := app.usuario_json(p_id);
  v_despues jsonb;
  v_rol text;
  v_regionales uuid[];
begin
  if v_antes is null then
    perform app.error('NO_ENCONTRADO', 'El usuario no existe.', jsonb_build_object('entidad', 'usuario', 'id', p_id));
  end if;
  if p_nombre is not null and btrim(p_nombre) = '' then
    perform app.error('VALIDACION', 'El nombre es obligatorio.', jsonb_build_object('campo', 'nombre', 'motivo', 'vacio'));
  end if;

  v_rol := coalesce(p_rol, v_antes ->> 'rol');
  v_regionales := case
    when p_regionales is not null then p_regionales
    when v_rol = 'nacional' then '{}'
    else array(select jsonb_array_elements_text(v_antes -> 'regionales')::uuid)
  end;
  perform app.validar_rol_regionales(v_rol, v_regionales);

  -- primero el rol: tg_usuario_regional_rol exige rol regional para asignar
  update public.usuario set nombre = coalesce(btrim(p_nombre), nombre), rol = v_rol where id = p_id;
  perform app.asignar_regionales(p_id, v_regionales);

  v_despues := app.usuario_json(p_id);
  perform app.auditar_usuario(p_actor, 'editar_usuario', p_id, jsonb_build_object('antes', v_antes, 'despues', v_despues));
  return v_despues;
end $$;

-- tg_ultimo_nacional impide dejar el sistema sin nacionales activos.
create function public.admin_cambiar_activo(p_actor uuid, p_id uuid, p_activo boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_usuario jsonb;
begin
  update public.usuario set activo = p_activo where id = p_id;
  if not found then
    perform app.error('NO_ENCONTRADO', 'El usuario no existe.', jsonb_build_object('entidad', 'usuario', 'id', p_id));
  end if;
  v_usuario := app.usuario_json(p_id);
  perform app.auditar_usuario(p_actor, case when p_activo then 'reactivar_usuario' else 'desactivar_usuario' end, p_id, '{}');
  return v_usuario;
end $$;

-- Tras cambiar la contraseña en auth: debe cambiarla en su próximo ingreso (CP-01.7).
create function public.admin_marcar_reseteo(p_actor uuid, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.usuario set debe_cambiar_password = true where id = p_id;
  if not found then
    perform app.error('NO_ENCONTRADO', 'El usuario no existe.', jsonb_build_object('entidad', 'usuario', 'id', p_id));
  end if;
  perform app.auditar_usuario(p_actor, 'resetear_password', p_id, '{}');
end $$;

revoke all on function
  public.admin_crear_usuario(uuid, uuid, text, text, text, uuid[]),
  public.admin_actualizar_usuario(uuid, uuid, text, text, uuid[]),
  public.admin_cambiar_activo(uuid, uuid, boolean),
  public.admin_marcar_reseteo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  public.admin_crear_usuario(uuid, uuid, text, text, text, uuid[]),
  public.admin_actualizar_usuario(uuid, uuid, text, text, uuid[]),
  public.admin_cambiar_activo(uuid, uuid, boolean),
  public.admin_marcar_reseteo(uuid, uuid)
  to service_role;

revoke execute on all functions in schema app from public;
