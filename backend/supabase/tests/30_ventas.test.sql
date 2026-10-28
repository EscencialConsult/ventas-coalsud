-- Emisión de notas de venta (Contrato §5.2, Reglas §1). Casos: CP-06.1, CP-06.2, CP-06.3, CP-06.8, CP-06.10,
-- CP-06.11, CP-06.16, CP-06.18. Factura, anulación y devoluciones: BE-14 y BE-16.
begin;
select plan(28);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base, activo)
select p.nombre, l.id, p.precio, p.activo
from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', 44, true), ('QUINUA BLANCA 400GR', 22, true), ('CHIA 200GR', 30, true), ('DESCONTINUADO', 10, false)) p (nombre, precio, activo);
insert into public.vendedor (regional_id, nombre, activo) values
  (tests.regional('LP'), 'Flavia Rivera', true), (tests.regional('LP'), 'Arturo Reynaga', false), (tests.regional('SCZ'), 'Mario Condori', true);
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id) values
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días')),
  (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', tests.condicion('Contado')),
  (tests.regional('SCZ'), 'Fidalga S.A. SCZ', 'supermercado', 'supermercado', tests.condicion('Contado'));

-- stock de LP: 100 de cada uno y 20 de quinua en poder de Flavia
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy(), null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 100, 0), tests.item_nota('QUINUA BLANCA 400GR', 100, 0), tests.item_nota('CHIA 200GR', 100, 0)));
select public.registrar_salida(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 20));

-- Emisión ----------------------------------------------------------------------------------
select is(
  (select r ->> 'numero' || ' ' || (r ->> 'bruto') || '/' || (r ->> 'total')
   from tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(
     tests.item_nota('QUINUA BLANCA 1KG', 2, 44), tests.item_nota('QUINUA BLANCA 400GR', 3, 22), tests.item_nota('CHIA 200GR', 1, 30))) r),
  'LP-0001 184.00/184.00',
  'Nota contado con 3 productos: LP-0001, total 88 + 66 + 30 (CP-06.1)');
select is(tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG'), 78.00,
  'Descuenta del almacén: 100 − 20 (a Flavia) − 2');
select is(
  (select condicion_tipo || '/' || dias_credito || '/' || canal || '/' || origen_stock from public.nota_venta where numero = 'LP-0001'),
  'contado/0/ruta/almacen',
  'Foto de la condición; sin canal elegido, el del cliente');
select is(
  (select array_agg(precio_base || '→' || precio_aplicado order by precio_base) from public.nota_venta_item i join public.nota_venta n on n.id = i.nota_venta_id where n.numero = 'LP-0001'),
  array['22.00→22.00', '30.00→30.00', '44.00→44.00'],
  'Cada ítem guarda la foto del precio de catálogo');
select is(
  (select count(*)::int from public.movimiento_inventario m join public.nota_venta n on n.id = m.nota_venta_id where n.numero = 'LP-0001' and m.tipo = 'venta'),
  3, 'Un movimiento de venta por ítem');

select is(
  (select r ->> 'numero' || ' ' || (r ->> 'bruto') || '/' || (r ->> 'descuento_bs') || '/' || (r ->> 'total')
   from tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(
     tests.item_nota('QUINUA BLANCA 1KG', 5, 46), tests.item_nota('QUINUA BLANCA 400GR', 10, 22), tests.item_nota('CHIA 200GR', 8, 30)), 10) r),
  'LP-0002 690.00/69.00/621.00',
  'Descuento 10 % sobre Bs 690: total 621.00, descuento 69.00 (CP-06.18)');
select is(
  (select condicion_tipo || '/' || (fecha_vencimiento - fecha) from public.nota_venta where numero = 'LP-0002'),
  'credito/30',
  'Crédito: vencimiento = fecha + 30 días');

-- Auditoría --------------------------------------------------------------------------------
select tests.como_postgres();
select is(
  (select datos from public.auditoria where accion = 'cambio_precio'),
  jsonb_build_object('producto_id', tests.producto('QUINUA BLANCA 1KG'), 'producto', 'QUINUA BLANCA 1KG', 'antes', 44.00, 'despues', 46.00),
  'El cambio de precio de 44 a 46 queda auditado (CP-06.3)');
select is(
  (select usuario_id = tests.id_de('vanessa@coalsud.demo') from public.auditoria where accion = 'cambio_precio'),
  true, 'a nombre de quien emitió');
select is(
  (select (datos ->> 'descuento_bs')::numeric from public.auditoria where accion = 'descuento'),
  69.00, 'El descuento queda auditado con su importe');
select is(
  (select (datos -> 'despues' ->> 'total')::numeric from public.auditoria where accion = 'emitir_nota' and datos -> 'despues' ->> 'numero' = 'LP-0002'),
  621.00, 'emitir_nota registra el total');

-- la foto no cambia si después cambia la condición
update public.condicion_pago set dias = 45 where nombre = 'Crédito 30 días';
select is((select dias_credito from public.nota_venta where numero = 'LP-0002'), 30,
  'Cambiar la condición después no altera la nota emitida');

-- Origen: saldo del vendedor (⚠ SUP-14) -----------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is(
  (tests.detalle_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 25, 44)), 0, 'vendedor')$$) ->> 'disponible')::numeric,
  20.00, 'Desde el saldo de Flavia, 25 cuando tiene 20: STOCK_INSUFICIENTE, disponible 20 (CP-06.10)');
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 5, 44)), 0, 'vendedor');
select is(
  tests.saldo(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), 'QUINUA BLANCA 1KG') || ' / ' || tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG'),
  '15.00 / 73.00',
  'Vende 5 desde el saldo de Flavia (queda 15); el almacén no cambia (CP-06.11)');
select is((select numero from public.nota_venta where origen_stock = 'vendedor'), 'LP-0003',
  'Una emisión rechazada no consume número: sigue LP-0003');

-- Validaciones ------------------------------------------------------------------------------
select is(tests.codigo_error($$select tests.emitir('LP', null, 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)))$$),
  'VALIDACION', 'Sin cliente: no guarda (CP-06.2)');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', null, jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)))$$),
  'VALIDACION', 'Sin vendedor: no guarda (CP-06.2)');
select is(tests.codigo_error($$select tests.emitir('LP', 'Fidalga S.A. SCZ', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)))$$),
  'VALIDACION', 'Un cliente de otra regional');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Arturo Reynaga', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)))$$),
  'REGISTRO_INACTIVO', 'Un vendedor inactivo');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('DESCONTINUADO', 1, 10)))$$),
  'REGISTRO_INACTIVO', 'Un producto inactivo');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30), tests.item_nota('CHIA 200GR', 2, 30)))$$),
  'VALIDACION', 'Un producto repetido (⚠ SUP-47)');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, -5)))$$),
  'VALIDACION', 'Un precio negativo');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)), 150)$$),
  'VALIDACION', 'Un descuento fuera de 0–100');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)), 0, 'otro')$$),
  'VALIDACION', 'Un origen de stock inválido');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)), 0, 'almacen', public.hoy() + 1)$$),
  'FECHA_INVALIDA', 'Fecha de mañana (CP-06.16)');
select is(tests.codigo_error($$update public.nota_venta set descuento_pct = 0 where numero = 'LP-0002'$$),
  '42501', 'Una nota emitida no se edita por API (CP-06.8)');

-- Permisos y día cerrado ---------------------------------------------------------------------
select tests.como('irene@coalsud.demo');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)))$$),
  'NO_AUTORIZADO', 'El nacional no emite notas (§9.2)');

select tests.como_postgres();
insert into public.liquidacion (regional_id, fecha, estado, total_ventas, total_efectivo) values (tests.regional('LP'), app.hoy() - 1, 'cerrada', 0, 0);
select tests.como('vanessa@coalsud.demo');
select is(tests.codigo_error($$select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 1, 30)), 0, 'almacen', public.hoy() - 1)$$),
  'DIA_CERRADO', 'Fecha de un día cerrado (CP-06.16, §9.4)');

select * from finish();
rollback;
