-- DATOS DE PRUEBA, solo local/dev (Datos Iniciales §3). Corre con db reset; nunca en prod.
-- Usuarios @coalsud.demo con contraseña Prueba123! (los mismos correos que los fixtures del frontend),
-- vendedores y clientes de ejemplo. Requiere la migración datos_base (regionales y condiciones).

-- Cuenta de auth con login por email + perfil + regionales. Los tokens van en '' y no en NULL:
-- GoTrue no puede leer NULL en esas columnas y el login falla.
create function pg_temp.usuario_prueba(p_email text, p_nombre text, p_rol text, p_regionales text[] default '{}')
returns void language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Prueba123!', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());

  insert into public.usuario (id, nombre, email, rol, debe_cambiar_password)
  values (v_id, p_nombre, p_email, p_rol, false);
  insert into public.usuario_regional (usuario_id, regional_id)
  select v_id, r.id from public.regional r where r.codigo = any (p_regionales);
end $$;

select pg_temp.usuario_prueba('irene@coalsud.demo', 'Irene', 'nacional');
select pg_temp.usuario_prueba('ingeniero@coalsud.demo', 'Ingeniero', 'nacional');
select pg_temp.usuario_prueba('vanessa@coalsud.demo', 'Vanessa', 'regional', '{LP,CBBA}');
select pg_temp.usuario_prueba('fernando@coalsud.demo', 'Fernando', 'regional', '{SCZ}');

-- Vendedores (nombres de F1/F3/F5, ficticios para pruebas).
insert into public.vendedor (regional_id, nombre, telefono)
select r.id, v.nombre, v.telefono
from (values
  ('LP', 'Flavia Rivera', '71234567'),
  ('LP', 'Arturo Reynaga', '72345678'),
  ('LP', 'Martha Canedo', null),
  ('CBBA', 'Jorge León', '73456789'),
  ('SCZ', 'Mario Condori', '74567890'),
  ('SCZ', 'Sheila', null),
  ('SCZ', 'Marcela', null)
) v (regional, nombre, telefono)
join public.regional r on r.codigo = v.regional;

-- Clientes (los mismos de los fixtures del frontend).
insert into public.cliente (regional_id, nombre, razon_social, nit, categoria, canal, vendedor_id, condicion_pago_id, zona)
select r.id, c.nombre, c.razon_social, c.nit, c.categoria, c.canal, v.id, cp.id, c.zona
from (values
  ('LP', 'Hipermaxi La Paz', 'Hipermaxi S.A.', '1028627025', 'supermercado', 'supermercado', 'Flavia Rivera', 'Crédito 30 días', 'Sur'),
  ('LP', 'Andys', 'Andys SRL', null, 'supermercado', 'supermercado', 'Flavia Rivera', 'Crédito 15 días', 'Calacoto'),
  ('LP', 'Macro Abasto', null, null, 'mayorista', 'ruta', 'Arturo Reynaga', 'Contado', 'Villa Fátima'),
  ('LP', 'Mi Super', null, null, 'supermercado', 'supermercado', 'Martha Canedo', 'Contado', 'Sopocachi'),
  ('LP', 'Tienda Rosita', null, null, 'minorista', 'ruta', 'Arturo Reynaga', 'Contado', 'El Tejar'),
  ('CBBA', 'Hipermaxi Cochabamba', 'Hipermaxi S.A.', '1028627025', 'supermercado', 'supermercado', 'Jorge León', 'Crédito 30 días', null),
  ('CBBA', 'Super America', null, null, 'supermercado', 'supermercado', 'Jorge León', 'Contado', null),
  ('SCZ', 'Fidalga S.A. SCZ', 'Fidalga S.A.', '1015279027', 'supermercado', 'supermercado', 'Mario Condori', 'Crédito 60 días', null),
  ('SCZ', 'Clínica Foianini', 'Clínica Foianini SRL', null, 'institucional', 'institucional', 'Sheila', 'Crédito 90 días', null)
) c (regional, nombre, razon_social, nit, categoria, canal, vendedor, condicion, zona)
join public.regional r on r.codigo = c.regional
join public.vendedor v on v.regional_id = r.id and v.nombre = c.vendedor
join public.condicion_pago cp on cp.nombre = c.condicion;
