-- Sesión y perfil (Contrato §3) y RPC de admin-usuarios (§8). Casos: CP-01.3, CP-01.5, CP-01.7, CP-02.6.
-- La Edge Function en sí (JWT, 403 a un regional, ban al desactivar) se prueba contra el stack local.
begin;
select plan(18);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
select tests.crear_usuario('baja@coalsud.demo', 'regional', '{LP}', false);
update public.usuario set debe_cambiar_password = true where email = 'fernando@coalsud.demo';
insert into auth.users (id, email) values
  (gen_random_uuid(), 'sinperfil@coalsud.demo'),
  (gen_random_uuid(), 'nuevo@coalsud.demo'),
  (gen_random_uuid(), 'otro@coalsud.demo');

-- Sesión -----------------------------------------------------------------------------------
select tests.como('irene@coalsud.demo');
select is((select p ->> 'rol' || '/' || jsonb_array_length(p -> 'regionales') from public.mi_perfil() p), 'nacional/3',
  'El nacional recibe todas las regionales');

select tests.como('vanessa@coalsud.demo');
select is((select string_agg(r ->> 'codigo', ',') from jsonb_array_elements(public.mi_perfil() -> 'regionales') r), 'CBBA,LP',
  'El regional recibe sus regionales, por nombre');
select is(public.hoy(), (now() at time zone 'America/La_Paz')::date,
  'hoy() es la fecha de Bolivia');
select is(tests.codigo_error($$select public.admin_crear_usuario(null, null, 'x', 'x@x.x', 'nacional', '{}')$$), '42501',
  'Un usuario no ejecuta las RPC admin_* (solo service_role)');

select tests.como('baja@coalsud.demo');
select is((select (p ->> 'activo') || '/' || jsonb_array_length(p -> 'regionales') from public.mi_perfil() p), 'false/0',
  'Un desactivado recibe su perfil con activo = false y sin regionales');
select is(tests.codigo_error($$select public.marcar_password_cambiado()$$), 'USUARIO_INACTIVO',
  'Un desactivado no marca el cambio de contraseña');

select tests.como('sinperfil@coalsud.demo');
select is(tests.codigo_error($$select public.mi_perfil()$$), 'NO_AUTORIZADO',
  'Una cuenta de auth sin perfil no entra');

select tests.como('fernando@coalsud.demo');
select public.marcar_password_cambiado();
select is((public.mi_perfil() ->> 'debe_cambiar_password')::boolean, false,
  'Tras cambiar la contraseña, ya no se le exige (CP-02.6)');

select tests.como_anon();
select is(tests.codigo_error($$select public.mi_perfil()$$), '42501',
  'anon no pide perfil');

-- RPC de admin-usuarios (como la Edge Function) --------------------------------------------
select tests.como_servicio();
select is(tests.codigo_error(format(
  $$select public.admin_crear_usuario(%L, %L, 'Sin Regional', 'nuevo@coalsud.demo', 'regional', '{}')$$,
  tests.id_de('irene@coalsud.demo'), tests.id_de('nuevo@coalsud.demo'))), 'VALIDACION',
  'Un regional necesita al menos una regional (CP-01.5)');
select is(tests.codigo_error(format(
  $$select public.admin_crear_usuario(%L, %L, 'Nacional', 'nuevo@coalsud.demo', 'nacional', array[%L]::uuid[])$$,
  tests.id_de('irene@coalsud.demo'), tests.id_de('nuevo@coalsud.demo'), tests.regional('LP'))), 'VALIDACION',
  'Al nacional no se le asignan regionales');
select is(
  (select u ->> 'email' || '/' || jsonb_array_length(u -> 'regionales') || '/' || (u ->> 'debe_cambiar_password')
   from public.admin_crear_usuario(tests.id_de('irene@coalsud.demo'), tests.id_de('nuevo@coalsud.demo'),
     ' Nuevo ', 'NUEVO@coalsud.demo', 'regional', array[tests.regional('LP')]) u),
  'nuevo@coalsud.demo/1/true',
  'Alta: correo en minúsculas, sus regionales y cambio de contraseña obligatorio');
select is(tests.codigo_error(format(
  $$select public.admin_crear_usuario(%L, %L, 'Otro', 'nuevo@coalsud.demo', 'regional', array[%L]::uuid[])$$,
  tests.id_de('irene@coalsud.demo'), tests.id_de('otro@coalsud.demo'), tests.regional('LP'))), 'DUPLICADO',
  'Correo repetido');
select is(
  (select count(*)::int from public.auditoria where accion = 'crear_usuario' and usuario_id = tests.id_de('irene@coalsud.demo')), 1,
  'El alta queda auditada a nombre del nacional que la hizo');
select is(tests.codigo_error(format($$select public.admin_cambiar_activo(%L, %L, false)$$,
  tests.id_de('irene@coalsud.demo'), tests.id_de('irene@coalsud.demo'))), 'ULTIMO_NACIONAL',
  'No se desactiva al único nacional activo (CP-01.3)');
select is(
  (select u ->> 'rol' || '/' || jsonb_array_length(u -> 'regionales')
   from public.admin_actualizar_usuario(tests.id_de('irene@coalsud.demo'), tests.id_de('vanessa@coalsud.demo'), null, 'nacional', null) u),
  'nacional/0',
  'Pasar a nacional le quita las regionales');
select public.admin_marcar_reseteo(tests.id_de('irene@coalsud.demo'), tests.id_de('fernando@coalsud.demo'));
select is((select debe_cambiar_password from public.usuario where id = tests.id_de('fernando@coalsud.demo')), true,
  'Resetear la contraseña obliga a cambiarla en el próximo ingreso (CP-01.7)');
select is(tests.codigo_error(format($$select public.admin_marcar_reseteo(%L, gen_random_uuid())$$, tests.id_de('irene@coalsud.demo'))), 'NO_ENCONTRADO',
  'Resetear a un usuario inexistente');

select * from finish();
rollback;
