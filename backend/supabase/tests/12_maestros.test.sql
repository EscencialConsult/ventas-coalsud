-- Maestros: políticas por patrón (Seguridad RLS §3.2, matriz §11) y auditoría por trigger (Esquema BD §4).
-- Casos: CP-04.3 (regional no edita el catálogo) y las acciones de maestros de Seguridad RLS §8.
begin;
select plan(21);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo) values ('Contado', 'contado');
insert into public.linea_comercial (nombre) values ('COMRURAL');

-- Regional: maestros de su regional sí, catálogo y configuración no ------------------------
select tests.como('vanessa@coalsud.demo');
select is(tests.filas($$insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera')$$), 1,
  'Vanessa crea vendedores en La Paz');
select is(tests.filas($$
  insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id)
  values (tests.regional('LP'), 'Andys', 'supermercado', 'supermercado', (select id from public.condicion_pago))
$$), 1, 'Vanessa crea clientes en La Paz');
select is(tests.filas($$insert into public.presupuesto (periodo, regional_id, meta, usuario_id) values ('2026-11', tests.regional('LP'), 5000, tests.id_de('vanessa@coalsud.demo'))$$), 1,
  'Vanessa carga la meta de La Paz');
select is(tests.codigo_error($$insert into public.producto (nombre, linea_id, precio_base) values ('CHIA 200GR', (select id from public.linea_comercial), 31.5)$$), '42501',
  'Un regional no crea productos (⚠ SUP-02)');
select is(tests.codigo_error($$insert into public.linea_comercial (nombre) values ('NUEVA')$$), '42501',
  'ni líneas comerciales');
select is(tests.codigo_error($$insert into public.almacen (regional_id, nombre) values (tests.regional('LP'), 'Depósito 2')$$), '42501',
  'ni almacenes');
select is(tests.filas($$update public.condicion_pago set dias = 0$$), 0,
  'ni edita condiciones de pago');

select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Intruso')$$), '42501',
  'Fernando no crea vendedores en La Paz');
select is(tests.filas($$update public.vendedor set telefono = '700' where nombre = 'Flavia Rivera'$$), 0,
  'ni edita los de La Paz');

-- Nacional: catálogo y configuración ------------------------------------------------------
select tests.como('irene@coalsud.demo');
select is(tests.filas($$insert into public.producto (nombre, linea_id, precio_base) values ('QUINUA BLANCA 1KG', (select id from public.linea_comercial), 44)$$), 1,
  'El nacional crea productos');
select is(tests.filas($$insert into public.almacen (regional_id, nombre) values (tests.regional('LP'), 'Depósito 2')$$), 1,
  'y almacenes');
select is(tests.filas($$update public.regional set nombre = 'La Paz (El Alto)' where codigo = 'LP'$$), 1,
  'y edita regionales');
select is(tests.codigo_error($$delete from public.producto$$), '42501',
  'Ningún maestro se borra: se desactiva');

-- Auditoría --------------------------------------------------------------------------------
select tests.como_postgres();
select is(
  (select accion || '/' || (usuario_id = tests.id_de('irene@coalsud.demo')) || '/' || coalesce(regional_id::text, 'sin regional')
   from public.auditoria where entidad = 'producto' order by id limit 1),
  'crear/true/sin regional',
  'Alta de producto: crear, a nombre del nacional, sin regional');
select is(
  (select (regional_id = tests.regional('LP')) and usuario_id = tests.id_de('vanessa@coalsud.demo')
   from public.auditoria where entidad = 'vendedor' and accion = 'crear'),
  true,
  'Alta de vendedor: con su regional y a nombre de quien la hizo');
select is(
  (select regional_id = tests.regional('LP') from public.auditoria where entidad = 'regional' and accion = 'editar'),
  true,
  'La edición de una regional se registra con esa regional');

select tests.como('irene@coalsud.demo');
update public.producto set precio_base = 46 where nombre = 'QUINUA BLANCA 1KG';
update public.producto set nombre = 'QUINUA BLANCA 1 KG' where nombre = 'QUINUA BLANCA 1KG';
update public.producto set nombre = nombre;
select tests.como('vanessa@coalsud.demo');
update public.cliente set activo = false where nombre = 'Andys';
update public.cliente set activo = true where nombre = 'Andys';

select tests.como_postgres();
select is(
  (select datos from public.auditoria where accion = 'cambio_precio_base'),
  '{"antes": {"precio_base": 44.00}, "despues": {"precio_base": 46.00}}'::jsonb,
  'Cambio de precio de lista: cambio_precio_base con antes y después');
select is(
  (select array_agg(k) from public.auditoria a, jsonb_object_keys(a.datos -> 'despues') k
   where a.entidad = 'producto' and a.accion = 'editar'),
  array['nombre'],
  'Una edición guarda solo las columnas que cambiaron');
select is((select count(*)::int from public.auditoria where entidad = 'producto'), 3,
  'Un update sin cambios reales no se audita');
select is(
  (select array_agg(accion order by id) from public.auditoria where entidad = 'cliente'),
  array['crear', 'desactivar', 'reactivar'],
  'Desactivar y reactivar un cliente quedan registrados como tales');
select is(
  (select regional_id = tests.regional('LP') from public.auditoria where entidad = 'presupuesto'),
  true,
  'La meta se audita con su regional');

select * from finish();
rollback;
