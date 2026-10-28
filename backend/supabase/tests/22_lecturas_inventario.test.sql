-- Lecturas de inventario: v_stock, v_movimiento, v_documento_inventario, kardex y saldo_vendedores
-- (Esquema BD §2, Contrato §6, Reglas de Cálculo §7.1).
begin;
select plan(15);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.linea_comercial (nombre, orden) values ('COMRURAL', 1);
insert into public.producto (nombre, linea_id, orden, precio_base, stock_minimo, activo)
select p.nombre, l.id, p.orden, 44, p.minimo, p.activo
from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', 3, 20, true), ('CHIA 200GR', 1, 5, true), ('DESCONTINUADO', 9, 0, false)) p (nombre, orden, minimo, activo);
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera');

-- Ayer un ingreso; hoy salida a Flavia, retorno, traspaso a SCZ y ajuste.
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy() - 1, null, tests.items('QUINUA BLANCA 1KG', 50));
select public.registrar_salida(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 20));
select public.registrar_retorno(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 4));
select public.registrar_traspaso(tests.almacen('LP'), tests.almacen('SCZ'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 10));
select public.registrar_ajuste(tests.almacen('LP'), public.hoy(), 'merma', tests.items('QUINUA BLANCA 1KG', -1));

-- v_stock ----------------------------------------------------------------------------------
select is((select count(*)::int from public.v_stock where regional_id = tests.regional('SCZ')), 0,
  'v_stock: Vanessa no ve filas de SCZ (ni siquiera en 0)');
select is(
  (select cantidad || '/' || bajo_minimo from public.v_stock where almacen_id = tests.almacen('LP') and ubicacion = 'almacen' and producto_nombre = 'QUINUA BLANCA 1KG'),
  '23.00/false',
  'Almacén LP: 50 − 20 + 4 − 10 − 1 = 23, sobre el mínimo de 20');
select is(
  (select cantidad || '/' || bajo_minimo from public.v_stock where almacen_id = tests.almacen('LP') and producto_nombre = 'CHIA 200GR'),
  '0/true',
  'Un producto que nunca ingresó figura en 0 y bajo su mínimo (alerta)');
select is((select count(*)::int from public.v_stock where producto_nombre = 'DESCONTINUADO'), 0,
  'Un inactivo sin saldo no figura');
select is(
  (select ubicacion || '/' || cantidad || '/' || vendedor_nombre || '/' || bajo_minimo from public.v_stock where vendedor_id = tests.vendedor('Flavia Rivera')),
  'vendedor/16.00/Flavia Rivera/false',
  'Saldo en poder de Flavia, sin alerta de mínimo (solo almacén)');
select is((select orden from public.v_stock where almacen_id = tests.almacen('LP') and producto_nombre = 'QUINUA BLANCA 1KG' and ubicacion = 'almacen'), 1003,
  'orden = línea × 1000 + producto (⚙ DT-25)');

-- v_movimiento y v_documento_inventario ----------------------------------------------------
select is(
  (select string_agg(distinct documento_numero || ' por ' || usuario_nombre, ',') from public.v_movimiento where tipo = 'salida'),
  'NS-LP-0001 por Vanessa',
  'v_movimiento: N° de documento y quién lo registró');

select tests.como('fernando@coalsud.demo');
select is(
  (select numero || '/' || (regional_destino_id = tests.regional('SCZ')) || '/' || almacen_destino_nombre || '/' || items || '/' || usuario_nombre
   from public.v_documento_inventario),
  'TR-LP-0001/true/Almacén Santa Cruz/1/Vanessa',
  'Fernando ve el traspaso recibido, con el nombre de quien lo envió desde LP');
select is((select cantidad from public.v_stock where almacen_id = tests.almacen('SCZ') and producto_nombre = 'QUINUA BLANCA 1KG'), 10.00,
  'y el stock que entró en Santa Cruz');
select is((select count(*)::int from public.kardex(tests.almacen('LP'), null, tests.producto('QUINUA BLANCA 1KG'))), 0,
  'El kardex respeta la RLS: Fernando no ve el de La Paz');

-- kardex y saldo de vendedores -------------------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is(
  array(select tipo || ' ' || saldo_anterior || '→' || saldo_nuevo from public.kardex(tests.almacen('LP'), null, tests.producto('QUINUA BLANCA 1KG'))),
  array['ingreso 0.00→50.00', 'salida 50.00→30.00', 'retorno 30.00→34.00', 'traspaso_salida 34.00→24.00', 'ajuste 24.00→23.00'],
  'Kardex del almacén: cada movimiento con su saldo anterior y nuevo, en orden');
select is((select saldo_anterior from public.kardex(tests.almacen('LP'), null, tests.producto('QUINUA BLANCA 1KG'), public.hoy()) limit 1), 50.00,
  'Con fecha desde, el primer saldo anterior incluye lo de antes (el ingreso de ayer)');
select is(
  array(select tipo || ' ' || saldo_anterior || '→' || saldo_nuevo from public.kardex(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), tests.producto('QUINUA BLANCA 1KG'))),
  array['salida 0.00→20.00', 'retorno 20.00→16.00'],
  'Kardex de la mercadería en poder de Flavia');
select is(
  (select saldo_inicial || '/' || entregado || '/' || vendido || '/' || retornado || '/' || saldo_final || '/' || valorizado
   from public.saldo_vendedores(tests.regional('LP'), public.hoy(), public.hoy()) where vendedor = 'Flavia Rivera'),
  '0/20.00/0/4.00/16.00/704.00',
  'Saldo de Flavia: entregado 20, retornado 4, saldo 16, valorizado 16 × 44 (Reglas §7.1)');

select tests.como('fernando@coalsud.demo');
select is((select count(*)::int from public.saldo_vendedores()), 0,
  'Fernando no ve saldos de vendedores de La Paz');

select * from finish();
rollback;
