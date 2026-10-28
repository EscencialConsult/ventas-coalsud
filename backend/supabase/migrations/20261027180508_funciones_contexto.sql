-- Funciones de contexto, errores y auditoría (Esquema BD §3, Seguridad RLS §3.1).
-- Viven en app (no expuesto). Las que usan las políticas se habilitan a authenticated en la migración de RLS.

-- Fecha de negocio: hoy en Bolivia (Reglas de Cálculo §11).
create function app.hoy()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/La_Paz')::date;
$$;

-- Error de negocio: el código viaja en hint y los datos para la UI en detail (Contrato de API §2, ⚙ DT-06).
create function app.error(p_codigo text, p_mensaje text, p_detalle jsonb default null)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception using
    errcode = 'P0001',
    message = p_mensaje,
    hint = p_codigo,
    detail = coalesce(p_detalle::text, '');
end $$;

-- Contexto del usuario de la sesión (auth.uid()) -------------------------------------------

create function app.usuario_activo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuario u where u.id = auth.uid() and u.activo);
$$;

create function app.is_nacional()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuario u where u.id = auth.uid() and u.activo and u.rol = 'nacional');
$$;

-- Todas las regionales si es nacional; las de usuario_regional si es regional.
create function app.mis_regionales()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select r.id from public.regional r where app.is_nacional()
  union
  select ur.regional_id
  from public.usuario u
  join public.usuario_regional ur on ur.usuario_id = u.id
  where u.id = auth.uid() and u.activo and u.rol = 'regional';
$$;

-- Solo el rol regional escribe datos transaccionales, y solo en sus regionales (⚠ SUP-31).
create function app.puede_escribir_regional(r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.usuario u
    join public.usuario_regional ur on ur.usuario_id = u.id
    where u.id = auth.uid() and u.activo and u.rol = 'regional' and ur.regional_id = r
  );
$$;

create function app.puede_leer_regional(r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_nacional() or app.puede_escribir_regional(r);
$$;

-- Guardas para el comienzo de las RPC ------------------------------------------------------

create function app.exigir_activo()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.usuario u where u.id = auth.uid() and not u.activo) then
    perform app.error('USUARIO_INACTIVO', 'Su cuenta está desactivada.');
  end if;
end $$;

create function app.exigir_escritura(p_regional uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_activo();
  if not app.puede_escribir_regional(p_regional) then
    perform app.error('NO_AUTORIZADO', 'No tiene permiso para operar en esta regional.',
      jsonb_build_object('regional_id', p_regional));
  end if;
end $$;

create function app.exigir_nacional()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_activo();
  if not app.is_nacional() then
    perform app.error('SOLO_NACIONAL', 'Solo un usuario nacional puede hacer esta acción.');
  end if;
end $$;

-- Liquidación y auditoría ------------------------------------------------------------------

-- Último día cerrado de la regional ('-infinity' si nunca cerró).
create function app.ultimo_cierre(p_regional uuid)
returns date language sql stable security definer set search_path = '' as $$
  select coalesce(max(l.fecha), '-infinity'::date)
  from public.liquidacion l
  where l.regional_id = p_regional and l.estado = 'cerrada';
$$;

create function app.auditar(
  p_accion text, p_entidad text, p_entidad_id text, p_regional uuid, p_datos jsonb default '{}'
)
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (usuario_id, regional_id, accion, entidad, entidad_id, datos)
  values (auth.uid(), p_regional, p_accion, p_entidad, p_entidad_id, coalesce(p_datos, '{}'));
$$;

-- Nadie ejecuta funciones de app salvo lo que habilite explícitamente la migración de RLS.
revoke execute on all functions in schema app from public;
