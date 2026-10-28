-- Devoluciones (Contrato §5.2, Reglas §4). Casos: CP-06.9, CP-06.13, CP-06.14, CP-06.15 y topes de abono/reembolso.
begin;
select plan(22);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base)
select p.nombre, l.id, p.precio from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', 44), ('QUINUA BLANCA 400GR', 22), ('CHIA 200GR', 30)) p (nombre, precio);
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id) values
  (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', tests.condicion('Contado')),
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'));

-- Ayer: N1 contado (10 × 44 = 440), N2 crédito con 10 % (440 → 396), N3 crédito (5 × 22 = 110). Hoy: N4 contado.
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy() - 1, null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 100, 0), tests.item_nota('QUINUA BLANCA 400GR', 100, 0)));
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 10, 44)), 0, 'almacen', public.hoy() - 1);
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 10, 44)), 10, 'almacen', public.hoy() - 1);
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 400GR', 5, 22)), 0, 'almacen', public.hoy() - 1);
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44)));

-- Cobros (hoy) y cierre de ayer
select tests.como_postgres();
create temporary table nota (alias text, id uuid) on commit drop;
grant select on nota to authenticated;
insert into nota select a, (select id from public.nota_venta where numero = n)
from (values ('N1', 'LP-0001'), ('N2', 'LP-0002'), ('N3', 'LP-0003'), ('N4', 'LP-0004')) x (a, n);
insert into public.cobranza (numero, regional_id, fecha, nota_venta_id, forma_pago, importe, usuario_id) values
  ('CB-LP-0001', tests.regional('LP'), app.hoy(), (select id from nota where alias = 'N2'), 'efectivo', 100, tests.id_de('vanessa@coalsud.demo')),
  ('CB-LP-0002', tests.regional('LP'), app.hoy(), (select id from nota where alias = 'N3'), 'efectivo', 50, tests.id_de('vanessa@coalsud.demo'));
update public.liquidacion set estado = 'cerrada', total_ventas = 0, total_efectivo = 0 where regional_id = tests.regional('LP') and fecha = app.hoy() - 1;

create function pg_temp.devolver(p_alias text, p_tipo text, p_producto text, p_cantidad numeric) returns jsonb language sql as $$
  select public.registrar_devolucion((select id from nota where alias = p_alias), p_tipo, 'producto dañado',
    jsonb_build_array(jsonb_build_object('producto_id', tests.producto(p_producto), 'cantidad', p_cantidad)))
$$;

-- Reembolso en contado ------------------------------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is(
  (select (m -> 'items' -> 0 ->> 'maximo') || '/' || (m ->> 'dia_cerrado') from public.max_devolvible((select id from nota where alias = 'N1')) m),
  '10.00/true', 'max_devolvible: todo lo vendido, día cerrado');
select is((select r ->> 'numero' || ' ' || (r ->> 'importe') from pg_temp.devolver('N1', 'reembolso', 'QUINUA BLANCA 1KG', 3) r),
  'DEV-LP-0001 132.00', 'Devolución con reembolso de 3 de 10: DEV-LP-0001 por 132.00 (CP-06.9)');
select is((select fecha = public.hoy() from public.devolucion where numero = 'DEV-LP-0001'), true,
  'con fecha de hoy');
select is(
  (select tipo || ' ' || cantidad || ' ' || (fecha = public.hoy()) from public.movimiento_inventario where devolucion_id = (select id from public.devolucion where numero = 'DEV-LP-0001')),
  'devolucion 3.00 true', 'Repone 3 en el almacén hoy; el día de la nota queda intacto');
select is((select (m -> 'items' -> 0 ->> 'devuelto') || '/' || (m -> 'items' -> 0 ->> 'maximo') from public.max_devolvible((select id from nota where alias = 'N1')) m),
  '3.00/7.00', 'Quedan 7 por devolver');
select is((tests.detalle_error($$select pg_temp.devolver('N1', 'reembolso', 'QUINUA BLANCA 1KG', 8)$$) ->> 'maximo')::numeric, 7.00,
  'Devolver 8 cuando quedan 7: DEVOLUCION_EXCEDE, máximo 7 (CP-06.14)');
select is(tests.codigo_error($$select pg_temp.devolver('N4', 'reembolso', 'QUINUA BLANCA 1KG', 1)$$), 'DEVOLUCION_DIA_ABIERTO',
  'Una nota del día abierto se anula, no se devuelve (CP-06.13)');
select is(tests.codigo_error($$select pg_temp.devolver('N1', 'abono_cuenta', 'QUINUA BLANCA 1KG', 1)$$), 'ABONO_NO_PERMITIDO',
  'Una nota al contado no admite abono');

-- Abono y reembolso en crédito -----------------------------------------------------------------
select is((select r ->> 'importe' from pg_temp.devolver('N2', 'abono_cuenta', 'QUINUA BLANCA 1KG', 2) r), '79.20',
  'Abono de 2 en una nota con 10 %: 2 × 44 × 0.9 = 79.20');
select is((select saldo from public.v_nota_venta where id = (select id from nota where alias = 'N2')), 216.80,
  'El saldo baja: 396 − 100 cobrado − 79.20 (CP-06.15)');
select is((tests.detalle_error($$select pg_temp.devolver('N3', 'abono_cuenta', 'QUINUA BLANCA 400GR', 5)$$) ->> 'saldo')::numeric, 60.00,
  'Un abono mayor al saldo (110 > 60): ABONO_NO_PERMITIDO');
select is((tests.detalle_error($$select pg_temp.devolver('N2', 'reembolso', 'QUINUA BLANCA 1KG', 3)$$) ->> 'cobrado_neto')::numeric, 100.00,
  'Reembolsar 118.80 de una nota a crédito con 100 cobrados: REEMBOLSO_EXCEDE_COBRADO');
select is((select r ->> 'importe' from pg_temp.devolver('N2', 'reembolso', 'QUINUA BLANCA 1KG', 2) r), '79.20',
  'Un reembolso dentro de lo cobrado se registra');
select is((select (m ->> 'cobrado_neto')::numeric from public.max_devolvible((select id from nota where alias = 'N2')) m), 20.80,
  'y el tope que queda es 100 − 79.20');

-- Validaciones --------------------------------------------------------------------------------
select is(tests.codigo_error($$select pg_temp.devolver('N1', 'reembolso', 'CHIA 200GR', 1)$$), 'VALIDACION',
  'Un producto que no está en la nota');
select is(tests.codigo_error($$select pg_temp.devolver('N1', 'otro', 'QUINUA BLANCA 1KG', 1)$$), 'VALIDACION',
  'Un tipo de reverso inválido');

-- Datos, auditoría y vista ------------------------------------------------------------------
select is((select nota_numero || ' ' || cliente_nombre || ' ' || importe || ' ' || usuario_nombre from public.v_devolucion where numero = 'DEV-LP-0001'),
  'LP-0001 Macro Abasto 132.00 Vanessa', 'v_devolucion: nota, cliente, importe y quién la registró');

select tests.como_postgres();
select is((select (datos ->> 'importe')::numeric from public.auditoria where accion = 'registrar_devolucion' and datos ->> 'numero' = 'DEV-LP-0001'), 132.00,
  'La devolución queda auditada con su importe');
update public.liquidacion set estado = 'cerrada', total_ventas = 0, total_efectivo = 0 where regional_id = tests.regional('LP') and fecha = app.hoy();

select tests.como('vanessa@coalsud.demo');
select is(tests.codigo_error($$select pg_temp.devolver('N1', 'reembolso', 'QUINUA BLANCA 1KG', 1)$$), 'DIA_CERRADO',
  'Con el día de hoy cerrado no se registran devoluciones');
select is(public.registrar_nc_contable((select id from public.devolucion where numero = 'DEV-LP-0001'), 'NC-0099') ->> 'nc_contable_numero', 'NC-0099',
  'El N° de nota de crédito contable se carga aunque el día esté cerrado');

-- Permisos -----------------------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$select pg_temp.devolver('N1', 'reembolso', 'QUINUA BLANCA 1KG', 1)$$), 'NO_AUTORIZADO',
  'Fernando no registra devoluciones de La Paz');
select tests.como('irene@coalsud.demo');
select is(tests.codigo_error($$select pg_temp.devolver('N1', 'reembolso', 'QUINUA BLANCA 1KG', 1)$$), 'NO_AUTORIZADO',
  'El nacional tampoco (§11)');

select * from finish();
rollback;
