-- RLS y grants (Seguridad RLS §3–4, §9). Casos: CP-01.3, CP-02.3, CP-02.4, CP-02.7, CP-03.3, CP-03.4,
-- CP-04.3, CP-09.4, CP-11.2, CP-11.3 y §9 (1, 3, 5, 7, 8, 9).
-- Pendientes, con su tarea: §9.2 y §9.4 (emitir_nota_venta, BE-13), §9.6 (reabrir, BE-17),
-- §9.10 y CP-01.5 (admin-usuarios, BE-07), CP-10.3 (EECC, BE-19).
begin;
select plan(39);

-- Datos (como postgres) --------------------------------------------------------------------
select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
select tests.crear_usuario('baja@coalsud.demo', 'regional', '{LP}', false);

insert into public.condicion_pago (nombre, tipo) values ('Contado', 'contado');
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base) select 'QUINUA BLANCA 1KG', id, 44 from public.linea_comercial;
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera'), (tests.regional('SCZ'), 'Mario Condori');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id)
select tests.regional(c.codigo), c.nombre, 'supermercado', 'supermercado', (select id from public.condicion_pago)
from (values ('LP', 'Hipermaxi LP'), ('SCZ', 'Fidalga SCZ')) c (codigo, nombre);

-- una nota por regional (LP y SCZ), con su ítem
insert into public.nota_venta (numero, regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, usuario_id)
select r.codigo || '-0001', r.id, app.hoy(), cl.id, v.id, 'supermercado', cl.condicion_pago_id, 'contado', tests.id_de(x.email)
from (values ('LP', 'vanessa@coalsud.demo'), ('SCZ', 'fernando@coalsud.demo')) x (codigo, email)
join public.regional r on r.codigo = x.codigo
join public.cliente cl on cl.regional_id = r.id
join public.vendedor v on v.regional_id = r.id;
insert into public.nota_venta_item (nota_venta_id, producto_id, cantidad, precio_base, precio_aplicado)
select n.id, p.id, 1, 44, 44 from public.nota_venta n cross join public.producto p;

-- inventario de LP: un ingreso (con stock) y un traspaso hacia SCZ
insert into public.documento_inventario (numero, tipo, regional_id, almacen_id, fecha, usuario_id)
values ('ING-LP-0001', 'ingreso', tests.regional('LP'), tests.almacen('LP'), app.hoy(), tests.id_de('vanessa@coalsud.demo'));
insert into public.movimiento_inventario (fecha, tipo, regional_id, almacen_id, producto_id, cantidad, documento_id, usuario_id)
select app.hoy(), 'ingreso', d.regional_id, d.almacen_id, p.id, 10, d.id, d.usuario_id
from public.documento_inventario d cross join public.producto p where d.numero = 'ING-LP-0001';
insert into public.documento_inventario (numero, tipo, regional_id, almacen_id, almacen_destino_id, fecha, usuario_id)
values ('TRA-LP-0001', 'traspaso', tests.regional('LP'), tests.almacen('LP'), tests.almacen('SCZ'), app.hoy(), tests.id_de('vanessa@coalsud.demo'));
insert into public.documento_inventario_item (documento_id, producto_id, cantidad)
select d.id, p.id, 2 from public.documento_inventario d cross join public.producto p where d.numero = 'TRA-LP-0001';

select app.auditar('prueba', 'regional', 'x', tests.regional('LP'));
insert into storage.objects (bucket_id, name)
values ('facturas', tests.regional('LP') || '/lp.pdf'), ('facturas', tests.regional('SCZ') || '/scz.pdf');

-- Estructura ------------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'Todas las tablas de public tienen RLS');
select is(
  (select array_agg(t.tablename::text order by t.tablename) from pg_tables t
   where t.schemaname = 'public' and not exists (
     select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename and p.cmd in ('SELECT', 'ALL'))),
  array['correlativo'],
  'Solo correlativo no tiene política de lectura');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and cmd <> 'SELECT' and tablename = any (array[
    'nota_venta', 'nota_venta_item', 'documento_inventario', 'documento_inventario_item', 'movimiento_inventario',
    'stock_saldo', 'devolucion', 'devolucion_item', 'cobranza', 'cxc_saldo_inicial', 'liquidacion', 'liquidacion_linea'])),
  0,
  'Ninguna política de escritura en las tablas transaccionales (patrón C)');
select is(
  (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'), 0,
  'anon no tiene privilegios en public');

-- Fernando (regional SCZ) ------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is((select count(*)::int from public.nota_venta where regional_id = tests.regional('LP')), 0,
  'Fernando no ve notas de La Paz (CP-02.3, §9.1)');
select is((select count(*)::int from public.nota_venta where regional_id = tests.regional('SCZ')), 1,
  'Fernando ve las notas de Santa Cruz');
select is((select count(*)::int from public.nota_venta_item), 1,
  'Fernando solo ve los ítems de sus notas');
select is((select count(*)::int from public.stock_saldo), 0,
  'Fernando no ve el stock de La Paz');
select is((select array_agg(numero) from public.documento_inventario), array['TRA-LP-0001'],
  'Fernando ve el traspaso que recibe, no el ingreso de La Paz');
select is((select count(*)::int from public.documento_inventario_item), 1,
  'y los ítems de ese traspaso');
select is(tests.codigo_error($$
  insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id)
  values (tests.regional('LP'), 'Intruso', 'minorista', 'ruta', (select id from public.condicion_pago))
$$), '42501', 'Fernando no crea clientes en La Paz (CP-03.3)');
select is(tests.codigo_error($$
  insert into public.presupuesto (periodo, regional_id, meta, usuario_id)
  values ('2026-11', tests.regional('LP'), 1000, tests.id_de('fernando@coalsud.demo'))
$$), '42501', 'Fernando no carga metas para La Paz (CP-09.4)');
select is(tests.filas($$update public.producto set precio_base = 1$$), 0,
  'Un regional no edita el catálogo (CP-04.3)');
select is((select count(*)::int from public.auditoria), 0,
  'Un regional no ve la auditoría (CP-11.3)');
select is(tests.codigo_error($$select * from public.correlativo$$), '42501',
  'Nadie lee correlativo');
select is((select count(*)::int from public.usuario), 1,
  'Fernando solo ve su usuario (nadie más en SCZ)');
select is((select count(*)::int from storage.objects where bucket_id = 'facturas'), 1,
  'Fernando solo ve el PDF de Santa Cruz');

-- Vanessa (regional LP + CBBA) -------------------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is((select count(*)::int from public.nota_venta), 1,
  'Vanessa ve las notas de sus regionales y no las de SCZ');
select is(tests.codigo_error($$
  insert into public.nota_venta (numero, regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, usuario_id)
  select 'LP-0099', regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, usuario_id
  from public.nota_venta limit 1
$$), '42501', 'Insert directo en nota_venta rechazado: solo por RPC (§9.7)');
select is(tests.codigo_error($$update public.stock_saldo set cantidad = 999$$), '42501',
  'Nadie edita el stock a mano (§9.5)');
select is(tests.filas($$
  insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id)
  values (tests.regional('LP'), 'Andys', 'supermercado', 'supermercado', (select id from public.condicion_pago))
$$), 1, 'Vanessa crea clientes en La Paz');
select is(tests.codigo_error($$
  insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id, vendedor_id)
  values (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', (select id from public.condicion_pago), tests.vendedor('Mario Condori'))
$$), 'VALIDACION', 'Un cliente de LP no lleva un vendedor de SCZ (CP-03.4)');
select is(tests.codigo_error($$update public.cliente set regional_id = tests.regional('SCZ') where nombre = 'Hipermaxi LP'$$), '42501',
  'Vanessa no mueve un cliente a una regional ajena');
select is((select count(*)::int from public.usuario), 2,
  'Vanessa ve su usuario y los de sus regionales');
select is((select count(*)::int from storage.objects where bucket_id = 'facturas' and name like tests.regional('SCZ') || '/%'), 0,
  'Vanessa no ve (ni puede firmar) el PDF de SCZ (§9.9)');
select is(tests.codigo_error(format($$insert into storage.objects (bucket_id, name) values ('facturas', '%s/otra.pdf')$$, tests.regional('SCZ'))), '42501',
  'Vanessa no sube PDFs a SCZ');
select is(tests.filas(format($$insert into storage.objects (bucket_id, name) values ('facturas', '%s/nueva.pdf')$$, tests.regional('LP'))), 1,
  'Vanessa sube el PDF de una nota de La Paz');

-- Irene (nacional) -------------------------------------------------------------------------
select tests.como('irene@coalsud.demo');
select is((select count(*)::int from public.nota_venta), 2,
  'El nacional ve todas las regionales');
select is(tests.codigo_error($$
  insert into public.nota_venta (numero, regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, usuario_id)
  select 'LP-0098', regional_id, fecha, cliente_id, vendedor_id, canal, condicion_pago_id, condicion_tipo, usuario_id
  from public.nota_venta limit 1
$$), '42501', 'El nacional no escribe datos transaccionales por API (CP-02.4)');
select is(tests.codigo_error($$
  insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id)
  values (tests.regional('LP'), 'Mi Super', 'supermercado', 'supermercado', (select id from public.condicion_pago))
$$), '42501', 'El nacional no crea clientes (matriz §11)');
select is(tests.filas($$update public.producto set precio_base = 45$$), 1,
  'El nacional edita el catálogo');
select is(tests.filas($$
  insert into public.presupuesto (periodo, regional_id, meta, usuario_id)
  values ('2026-11', tests.regional('LP'), 1000, tests.id_de('irene@coalsud.demo'))
$$), 1, 'El nacional carga presupuesto (⚠ SUP-33)');
select ok((select count(*) from public.auditoria) >= 1,
  'El nacional ve la auditoría');
select is(tests.codigo_error($$update public.auditoria set accion = 'x'$$), '42501',
  'La auditoría no se edita (CP-11.2, §9.3)');
select is((select count(*)::int from public.usuario), 4,
  'El nacional ve todos los usuarios');

-- Usuario desactivado con un JWT todavía válido --------------------------------------------
select tests.como('baja@coalsud.demo');
select is((select count(*)::int from public.cliente), 0,
  'Un usuario desactivado no lee clientes (§9.8, CP-02.7)');
select is((select count(*)::int from public.producto), 0,
  'ni el catálogo');

-- Sin sesión -------------------------------------------------------------------------------
select tests.como_anon();
select is(tests.codigo_error($$select * from public.cliente$$), '42501',
  'anon no lee nada de public');

-- Usuarios (como postgres) -----------------------------------------------------------------
select tests.como_postgres();
select is(tests.codigo_error($$update public.usuario set activo = false where email = 'irene@coalsud.demo'$$), 'ULTIMO_NACIONAL',
  'No se desactiva al único nacional activo (CP-01.3)');

select * from finish();
rollback;
