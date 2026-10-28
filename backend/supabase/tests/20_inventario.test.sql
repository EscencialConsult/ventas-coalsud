-- RPC de inventario (Contrato §5.1). Casos: CP-05.1 a CP-05.4, CP-05.6 a CP-05.10, CP-03.6 y numeración (⚠ SUP-28).
-- CP-05.12 (dos salidas simultáneas) va en scripts/concurrencia.mjs: necesita dos conexiones.
begin;
select plan(30);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base, activo)
select p.nombre, l.id, 44, p.activo from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', true), ('CHIA 200GR', true), ('DESCONTINUADO', false)) p (nombre, activo);
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera'), (tests.regional('SCZ'), 'Mario Condori');
insert into public.almacen (regional_id, nombre) values (tests.regional('LP'), 'Depósito 2');


-- Ingreso, salida, retorno (Vanessa, LP) ---------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is(public.registrar_ingreso(tests.almacen('LP'), public.hoy(), 'Remito 123', tests.items('QUINUA BLANCA 1KG', 50)) ->> 'numero', 'NI-LP-0001',
  'Ingreso: número NI-LP-0001 (CP-05.1)');
select is(tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG'), 50.00,
  'El ingreso suma 50 al almacén');
select is((select referencia || '/' || fecha from public.documento_inventario where numero = 'NI-LP-0001'), 'Remito 123/' || public.hoy(),
  'El documento guarda referencia y fecha');
select is(public.registrar_ingreso(tests.almacen('LP'), public.hoy(), null, tests.items('CHIA 200GR', 10)) ->> 'numero', 'NI-LP-0002',
  'La numeración es correlativa por regional y tipo');

select is(public.registrar_salida(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 20)) ->> 'numero', 'NS-LP-0001',
  'Salida a Flavia: NS-LP-0001 (CP-05.2)');
select is(
  tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG') || ' / ' || tests.saldo(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), 'QUINUA BLANCA 1KG'),
  '30.00 / 20.00',
  'Almacén −20, Flavia +20: el total de La Paz no cambia');
select is(tests.codigo_error(format($$select public.registrar_salida(%L, %L, public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 100))$$, tests.almacen('LP'), tests.vendedor('Flavia Rivera'))),
  'STOCK_INSUFICIENTE', 'Salida mayor al stock: rechazada (CP-05.4)');
select is((tests.detalle_error(format($$select public.registrar_salida(%L, %L, public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 100))$$, tests.almacen('LP'), tests.vendedor('Flavia Rivera'))) ->> 'disponible')::numeric,
  30.00, 'y el detalle trae lo disponible');

select public.registrar_retorno(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 4));
select is(
  tests.saldo(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), 'QUINUA BLANCA 1KG') || ' / ' || tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG'),
  '16.00 / 34.00',
  'Retorno de 4: Flavia 16, almacén +4 (CP-05.7)');
select is(tests.codigo_error(format($$select public.registrar_retorno(%L, %L, public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 25))$$, tests.almacen('LP'), tests.vendedor('Flavia Rivera'))),
  'STOCK_INSUFICIENTE', 'Retorno mayor a lo que tiene Flavia: rechazado (CP-05.8)');

-- Traspaso y ajuste ------------------------------------------------------------------------
select is(public.registrar_traspaso(tests.almacen('LP'), tests.almacen('SCZ'), public.hoy(), 'Camión 1', tests.items('QUINUA BLANCA 1KG', 30)) ->> 'numero', 'TR-LP-0001',
  'Traspaso LP → SCZ: TR-LP-0001 (CP-05.3)');
select is(
  tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG') || ' / ' || tests.saldo(tests.almacen('SCZ'), null, 'QUINUA BLANCA 1KG'),
  '4.00 / 30.00',
  'Salida en La Paz (−30) y entrada en Santa Cruz (+30)');
-- como postgres: Vanessa no ve el movimiento de entrada en SCZ (RLS por regional)
select tests.como_postgres();
select is(
  (select array_agg(m.tipo order by m.tipo) from public.movimiento_inventario m join public.documento_inventario d on d.id = m.documento_id where d.numero = 'TR-LP-0001'),
  array['traspaso_entrada', 'traspaso_salida'],
  'con el mismo documento');
select tests.como('vanessa@coalsud.demo');
select is(tests.codigo_error(format($$select public.registrar_traspaso(%L, %L, public.hoy(), null, tests.items('CHIA 200GR', 1))$$, tests.almacen('LP'), tests.almacen('LP') )),
  'VALIDACION', 'El traspaso es hacia otra regional');

select is(tests.codigo_error(format($$select public.registrar_ajuste(%L, public.hoy(), '  ', tests.items('QUINUA BLANCA 1KG', -3))$$, tests.almacen('LP'))),
  'VALIDACION', 'Ajuste sin motivo: no guarda (CP-05.9)');
select is(public.registrar_ajuste(tests.almacen('LP'), public.hoy(), 'merma', tests.items('QUINUA BLANCA 1KG', -3)) ->> 'numero', 'AJ-LP-0001',
  'Ajuste −3 por merma: AJ-LP-0001');
select is(tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG'), 1.00,
  'y descuenta del almacén');
select is(tests.codigo_error(format($$select public.registrar_ajuste(%L, public.hoy(), 'conteo_fisico', tests.items('QUINUA BLANCA 1KG', -5))$$, tests.almacen('LP'))),
  'STOCK_INSUFICIENTE', 'Un ajuste no deja saldo negativo');

-- Validaciones ------------------------------------------------------------------------------
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy() + 1, null, tests.items('CHIA 200GR', 1))$$, tests.almacen('LP'))),
  'FECHA_INVALIDA', 'Fecha futura');
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy(), null, tests.items('DESCONTINUADO', 1))$$, tests.almacen('LP'))),
  'REGISTRO_INACTIVO', 'Producto inactivo');
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy(), null, tests.items('CHIA 200GR', 1) || tests.items('CHIA 200GR', 2))$$, tests.almacen('LP'))),
  'VALIDACION', 'Producto repetido en el mismo documento');
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy(), null, tests.items('CHIA 200GR', 0))$$, tests.almacen('LP'))),
  'VALIDACION', 'Cantidad 0 en un ingreso');
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy(), null, '[]')$$, tests.almacen('LP'))),
  'VALIDACION', 'Documento sin ítems');
select is(tests.codigo_error(format($$select public.registrar_salida(%L, %L, public.hoy(), null, tests.items('CHIA 200GR', 1))$$, tests.almacen('LP'), tests.vendedor('Mario Condori'))),
  'VALIDACION', 'Salida a un vendedor de otra regional');
select is(tests.codigo_error(format($$update public.vendedor set activo = false where id = %L$$, tests.vendedor('Flavia Rivera'))),
  'VENDEDOR_CON_SALDO', 'No se desactiva a Flavia con mercadería en su poder (CP-03.6)');

-- Permisos y día ---------------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy(), null, tests.items('CHIA 200GR', 1))$$, tests.almacen('LP'))),
  'NO_AUTORIZADO', 'Fernando no registra en un almacén de La Paz');
select tests.como('irene@coalsud.demo');
select is(tests.codigo_error(format($$select public.registrar_ingreso(%L, public.hoy(), null, tests.items('CHIA 200GR', 1))$$, tests.almacen('LP'))),
  'NO_AUTORIZADO', 'El nacional no registra movimientos (⚠ SUP-31)');

select tests.como_postgres();
update public.liquidacion set estado = 'cerrada', total_ventas = 0, total_efectivo = 0
where regional_id = tests.regional('SCZ') and fecha = app.hoy();
update public.correlativo set ultimo = 9999 where regional_id = tests.regional('LP') and tipo_documento = 'ingreso';

select tests.como('vanessa@coalsud.demo');
select is(
  tests.detalle_error(format($$select public.registrar_traspaso(%L, %L, public.hoy(), null, tests.items('CHIA 200GR', 1))$$, tests.almacen('LP'), tests.almacen('SCZ'))) ->> 'regional',
  'SCZ', 'Traspaso con el día de SCZ cerrado: DIA_CERRADO de la regional destino (CP-05.10)');
select is(public.registrar_ingreso(tests.almacen('LP'), public.hoy(), null, tests.items('CHIA 200GR', 1)) ->> 'numero', 'NI-LP-10000',
  'La numeración sigue después de 9999, sin reiniciar (⚠ SUP-28)');

select tests.como_postgres();
select is(
  (select count(*)::int from public.stock_saldo s
   where s.cantidad <> (select sum(m.cantidad) from public.movimiento_inventario m
                        where m.almacen_id = s.almacen_id and m.vendedor_id is not distinct from s.vendedor_id and m.producto_id = s.producto_id)),
  0, 'Cada saldo es la suma de sus movimientos');

select * from finish();
rollback;
