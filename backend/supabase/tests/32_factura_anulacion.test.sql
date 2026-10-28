-- Factura, anulación y v_nota_venta (Contrato §5.2, Reglas §5). Casos: CP-06.4 (BD), CP-06.7, CP-06.12, CP-06.17,
-- ⚠ SUP-06 y SUP-41.
begin;
select plan(23);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP,CBBA}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base) select 'QUINUA BLANCA 1KG', id, 44 from public.linea_comercial;
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id) values
  (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', tests.condicion('Contado')),
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'));

-- Ayer: N4 (contado). Hoy: N1 contado, N2 crédito, N3 desde el saldo de Flavia.
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy() - 1, null, tests.items('QUINUA BLANCA 1KG', 100));
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44)), 0, 'almacen', public.hoy() - 1);
select public.registrar_salida(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy(), null, tests.items('QUINUA BLANCA 1KG', 20));
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 2, 44)));
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 3, 44)));
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 5, 44)), 0, 'vendedor');
create temporary table nota (alias text, id uuid) on commit drop;
grant select on nota to authenticated;
insert into nota select a, (select id from public.nota_venta where numero = n) from (values ('N4', 'LP-0001'), ('N1', 'LP-0002'), ('N2', 'LP-0003'), ('N3', 'LP-0004')) x (a, n);

-- v_nota_venta ------------------------------------------------------------------------------
select is((select bruto || '/' || total || '/' || saldo || '/' || pendiente_factura || '/' || usuario_nombre from public.v_nota_venta where id = (select id from nota where alias = 'N1')),
  '88.00/88.00/0/true/Vanessa', 'v_nota_venta: contado sin saldo, pendiente de factura, con quién la emitió');
select is((select saldo from public.v_nota_venta where id = (select id from nota where alias = 'N2')), 132.00,
  'Crédito: el saldo es el total mientras no haya cobranzas');

-- Factura ------------------------------------------------------------------------------------
select is((public.registrar_factura_nota((select id from nota where alias = 'N1'), ' F-1462 ', null)) ->> 'advertencia_duplicado', 'false',
  'Registrar la factura de una nota (CP-06.4)');
select is((select numero_factura || '/' || pendiente_factura from public.v_nota_venta where id = (select id from nota where alias = 'N1')), 'F-1462/false',
  'y deja de estar pendiente');
select is((public.registrar_factura_nota((select id from nota where alias = 'N2'), 'F-1462', tests.regional('LP') || '/n2.pdf')) ->> 'advertencia_duplicado', 'true',
  'Un N° ya usado en otra nota emitida avisa, no impide (⚠ SUP-41)');
select is(tests.codigo_error(format($$select public.registrar_factura_nota(%L, '  ', null)$$, (select id from nota where alias = 'N2'))),
  'VALIDACION', 'N° de factura vacío');
select is(tests.codigo_error(format($$select public.registrar_factura_nota(%L, 'F-9', '%s/x.pdf')$$, (select id from nota where alias = 'N2'), tests.regional('SCZ'))),
  'VALIDACION', 'Un PDF de la carpeta de otra regional');

-- Día cerrado: la factura se registra igual (⚠ SUP-06)
select tests.como_postgres();
insert into public.liquidacion (regional_id, fecha, estado, total_ventas, total_efectivo) values (tests.regional('LP'), app.hoy() - 1, 'cerrada', 44, 44)
on conflict (regional_id, fecha) do update set estado = 'cerrada', total_ventas = 44, total_efectivo = 44;
select tests.como('vanessa@coalsud.demo');
select is((public.registrar_factura_nota((select id from nota where alias = 'N4'), 'F-1400', null)) ->> 'numero_factura', 'F-1400',
  'Factura de una nota de un día cerrado: se permite (CP-06.17)');
select is((select dia_cerrado from public.v_nota_venta where id = (select id from nota where alias = 'N4')), true,
  'v_nota_venta marca el día cerrado');

-- Anulación ---------------------------------------------------------------------------------
select is((select r ->> 'estado' || ' / ' || (r ->> 'aviso_factura') from public.anular_nota_venta((select id from nota where alias = 'N1'), 'El cliente pidió 8 y se facturó 10') r),
  'anulada / Avisar a Contabilidad que anule la factura N° F-1462.', 'Anular una nota del día abierto, con aviso de la factura (CP-06.7)');
select is(tests.saldo(tests.almacen('LP'), null, 'QUINUA BLANCA 1KG'), 76.00,
  'Repone el stock al almacén: 100 − 1 − 20 − 2 − 3 + 2');
select public.anular_nota_venta((select id from nota where alias = 'N3'), 'Error de carga');
select is(tests.saldo(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), 'QUINUA BLANCA 1KG'), 20.00,
  'Una nota desde el saldo del vendedor repone a Flavia');
select is((select saldo || '/' || estado from public.v_nota_venta where id = (select id from nota where alias = 'N1')), '0/anulada',
  'Una anulada no tiene saldo');
select is(tests.codigo_error(format($$select public.anular_nota_venta(%L, 'otra vez')$$, (select id from nota where alias = 'N1'))),
  'NOTA_ANULADA', 'No se anula dos veces');
select is(tests.codigo_error(format($$select public.registrar_factura_nota(%L, 'F-1', null)$$, (select id from nota where alias = 'N1'))),
  'NOTA_ANULADA', 'Ni se le registra factura');
select is(tests.codigo_error(format($$select public.anular_nota_venta(%L, ' ')$$, (select id from nota where alias = 'N2'))),
  'VALIDACION', 'El motivo es obligatorio');
select is(tests.detalle_error(format($$select public.anular_nota_venta(%L, 'tarde')$$, (select id from nota where alias = 'N4'))) ->> 'motivo',
  'dia_cerrado', 'Una nota de un día cerrado no se anula: NOTA_NO_ANULABLE (usar devolución)');

-- Cobranzas y abonos en el saldo ------------------------------------------------------------
select tests.como_postgres();
insert into public.cobranza (numero, regional_id, fecha, nota_venta_id, forma_pago, importe, usuario_id)
values ('CB-LP-0001', tests.regional('LP'), app.hoy(), (select id from nota where alias = 'N2'), 'efectivo', 50, tests.id_de('vanessa@coalsud.demo'));
insert into public.devolucion (numero, regional_id, fecha, nota_venta_id, tipo_reverso, motivo, usuario_id)
values ('DEV-LP-0001', tests.regional('LP'), app.hoy(), (select id from nota where alias = 'N2'), 'abono_cuenta', 'producto dañado', tests.id_de('vanessa@coalsud.demo'));
insert into public.devolucion_item (devolucion_id, producto_id, cantidad, precio_aplicado)
select id, tests.producto('QUINUA BLANCA 1KG'), 1, 44 from public.devolucion where numero = 'DEV-LP-0001';

select tests.como('vanessa@coalsud.demo');
select is((select cobrado || '/' || abonado || '/' || saldo || '/' || tiene_devolucion from public.v_nota_venta where id = (select id from nota where alias = 'N2')),
  '50.00/44.00/38.00/true', 'Saldo = 132 − 50 cobrado − 44 abonado (Reglas §5)');
select is(jsonb_array_length(tests.detalle_error(format($$select public.anular_nota_venta(%L, 'x')$$, (select id from nota where alias = 'N2'))) -> 'cobranzas'),
  1, 'Con una cobranza vigente: NOTA_NO_ANULABLE con la lista de cobranzas (CP-06.12)');

-- Permisos -----------------------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is((select count(*)::int from public.v_nota_venta), 0, 'Fernando no ve notas de La Paz');
select is(tests.codigo_error(format($$select public.anular_nota_venta(%L, 'x')$$, (select id from nota where alias = 'N2'))),
  'NO_AUTORIZADO', 'ni puede anularlas');
select tests.como('irene@coalsud.demo');
select is(tests.codigo_error(format($$select public.registrar_factura_nota(%L, 'F-2', null)$$, (select id from nota where alias = 'N2'))),
  'NO_AUTORIZADO', 'El nacional no registra facturas (§11)');
select is((select count(*)::int from public.v_nota_venta), 4, 'El nacional ve todas las notas');

select * from finish();
rollback;
