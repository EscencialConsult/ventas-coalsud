-- Cobranzas, cartera inicial e ingresos por vendedor (Contrato §5.3, Reglas §5 y §7.2).
-- Casos: CP-07.1, CP-07.3 a CP-07.8 (capa BD) y ⚠ SUP-22/24.
begin;
select plan(25);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base)
select p.nombre, l.id, p.precio from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', 44), ('QUINUA BLANCA 400GR', 22)) p (nombre, precio);
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera'), (tests.regional('LP'), 'Arturo Reynaga'), (tests.regional('SCZ'), 'Mario Condori');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id, vendedor_id) values
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'), tests.vendedor('Flavia Rivera')),
  (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', tests.condicion('Contado'), tests.vendedor('Arturo Reynaga')),
  (tests.regional('SCZ'), 'Fidalga S.A. SCZ', 'supermercado', 'supermercado', tests.condicion('Contado'), tests.vendedor('Mario Condori'));

-- Hoy: N1 crédito 440 (Flavia), N2 contado 88 (Arturo), N3 crédito 110 (Flavia)
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy() - 1, null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 100, 0), tests.item_nota('QUINUA BLANCA 400GR', 100, 0)));
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 10, 44)));
select tests.emitir('LP', 'Macro Abasto', 'Arturo Reynaga', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 2, 44)));
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 400GR', 5, 22)));

create function pg_temp.doc(p_numero text) returns uuid language sql as $$
  select coalesce((select id from public.nota_venta where numero = p_numero), (select id from public.cxc_saldo_inicial where numero_documento = p_numero))
$$;
create function pg_temp.aplicacion(p_tipo text, p_numero text, p_importe numeric) returns jsonb language sql as $$
  select jsonb_build_object('tipo_doc', p_tipo, 'documento_id', pg_temp.doc(p_numero), 'importe', p_importe)
$$;
create function pg_temp.cobrar(p_aplicaciones jsonb, p_fecha date default null, p_forma text default 'efectivo') returns jsonb language sql as $$
  select public.registrar_cobranzas(tests.regional('LP'), coalesce(p_fecha, public.hoy()), p_forma, null, null, p_aplicaciones)
$$;
create function pg_temp.cartera(p_cliente text, p_numero text, p_importe numeric) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('cliente_id', tests.cliente(p_cliente), 'numero_documento', p_numero,
    'fecha_documento', '2026-05-20', 'fecha_vencimiento', '2026-06-19', 'importe', p_importe))
$$;

-- Cartera inicial (⚠ SUP-24) -----------------------------------------------------------------
select is(tests.codigo_error($$select public.cargar_cartera_inicial(tests.regional('LP'), pg_temp.cartera('Hipermaxi La Paz', 'F-1463', 1224.60))$$),
  'SOLO_NACIONAL', 'Un regional no carga cartera inicial');
select tests.como('irene@coalsud.demo');
select is(public.cargar_cartera_inicial(tests.regional('LP'), pg_temp.cartera('Hipermaxi La Paz', 'F-1463', 1224.60)) ->> 'insertados', '1',
  'El nacional carga la cartera inicial');
select is(tests.codigo_error($$select public.cargar_cartera_inicial(tests.regional('LP'), pg_temp.cartera('Hipermaxi La Paz', 'F-1463', 10))$$),
  'DUPLICADO', 'Un documento repetido');
select is(tests.codigo_error($$select public.cargar_cartera_inicial(tests.regional('LP'), pg_temp.cartera('Fidalga S.A. SCZ', 'F-9', 10))$$),
  'VALIDACION', 'Un cliente de otra regional');

-- Saldos por documento ----------------------------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is(
  (select array_agg(numero || ' ' || saldo order by fecha, numero) from public.v_saldo_documento where cliente_id = tests.cliente('Hipermaxi La Paz') and saldo > 0),
  array['F-1463 1224.60', 'LP-0001 440.00', 'LP-0003 110.00'],
  'Documentos por cobrar de Hipermaxi: la cartera inicial y sus notas a crédito (no la contado)');
select is((select vencido and dias_mora > 0 from public.v_saldo_documento where numero = 'F-1463'), true,
  'La cartera inicial vencida muestra días de mora');

-- Registrar cobranzas ------------------------------------------------------------------------
select is(
  (select array_agg(c ->> 'numero' || ' ' || (c ->> 'importe')) from jsonb_array_elements(pg_temp.cobrar(jsonb_build_array(
     pg_temp.aplicacion('nota', 'LP-0001', 200), pg_temp.aplicacion('saldo_inicial', 'F-1463', 1000)))) c),
  array['CB-LP-0001 200.00', 'CB-LP-0002 1000.00'],
  'Un cobro repartido en dos documentos: una cobranza por documento (CP-07.1, ⚠ SUP-22)');
select is(
  (select array_agg(numero || ' ' || cobrado || '/' || saldo order by numero) from public.v_saldo_documento where numero in ('LP-0001', 'F-1463')),
  array['F-1463 1000.00/224.60', 'LP-0001 200.00/240.00'],
  'Los saldos bajan');
select is((tests.detalle_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 300)))$$) ->> 'saldo')::numeric,
  240.00, 'Cobrar más que el saldo: IMPORTE_EXCEDE_SALDO, con el saldo');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0002', 10)))$$),
  'DOCUMENTO_CONTADO', 'Una nota al contado no se cobra');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 10), pg_temp.aplicacion('nota', 'LP-0001', 10)))$$),
  'VALIDACION', 'El mismo documento dos veces en un cobro');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 10)), null, 'trueque')$$),
  'VALIDACION', 'Una forma de pago inválida');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 10)), public.hoy() + 1)$$),
  'FECHA_INVALIDA', 'Fecha futura');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 10), pg_temp.aplicacion('nota', 'LP-0001', 5000)))$$)
  || ' / ' || (select count(*) from public.cobranza),
  'VALIDACION / 2', 'Si una aplicación falla no queda ninguna (todo en una transacción)');
select public.anular_nota_venta(pg_temp.doc('LP-0003'), 'error');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0003', 10)))$$),
  'NOTA_ANULADA', 'Una nota anulada no se cobra');
select is(
  (select documento_numero || ' ' || cliente_nombre || ' ' || (vendedor_id = tests.vendedor('Flavia Rivera')) || ' ' || usuario_nombre from public.v_cobranza where numero = 'CB-LP-0002'),
  'F-1463 Hipermaxi La Paz true Vanessa',
  'v_cobranza: la de cartera inicial se atribuye al vendedor del cliente (Reglas §7.2)');

-- Anular cobranza ---------------------------------------------------------------------------
select is(tests.codigo_error($$select public.anular_cobranza((select id from public.cobranza where numero = 'CB-LP-0001'), ' ')$$),
  'VALIDACION', 'Anular sin motivo');
select is(public.anular_cobranza((select id from public.cobranza where numero = 'CB-LP-0001'), 'importe equivocado') ->> 'estado', 'anulada',
  'Anular una cobranza del día abierto');
select is((select saldo from public.v_saldo_documento where numero = 'LP-0001'), 440.00,
  'y el saldo de la nota vuelve');
select is(tests.codigo_error($$select public.anular_cobranza((select id from public.cobranza where numero = 'CB-LP-0001'), 'otra vez')$$),
  'COBRANZA_NO_ANULABLE', 'No se anula dos veces');
select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('saldo_inicial', 'F-1463', 100)), public.hoy() - 1);
select tests.como_postgres();
update public.liquidacion set estado = 'cerrada', total_ventas = 0, total_efectivo = 0 where regional_id = tests.regional('LP') and fecha = app.hoy() - 1;
select tests.como('vanessa@coalsud.demo');
select is(tests.codigo_error($$select public.anular_cobranza((select id from public.cobranza where numero = 'CB-LP-0003'), 'tarde')$$),
  'COBRANZA_NO_ANULABLE', 'Una cobranza de un día cerrado no se anula');

-- Ingresos por vendedor (Reglas §7.2) -----------------------------------------------------------
select is(
  (select array_agg(f ->> 'vendedor' || ': ' || (f ->> 'notas') || ' notas, contado ' || (f ->> 'ventas_contado') || ', crédito ' || (f ->> 'ventas_credito')
     || ', cobranzas ' || (f ->> 'cobranzas') || ', ingreso ' || (f ->> 'ingreso'))
   from jsonb_array_elements(public.ingresos_vendedores(tests.regional('LP'), public.hoy(), public.hoy())) f),
  array['Arturo Reynaga: 1 notas, contado 88.00, crédito 0, cobranzas 0, ingreso 88.00',
        'Flavia Rivera: 1 notas, contado 0, crédito 440.00, cobranzas 1000.00, ingreso 1000.00'],
  'Ingreso = contado + cobranzas vigentes − reembolsos; la anulada y la cobranza anulada no cuentan');
select is(
  (select jsonb_array_length(f -> 'detalle') from jsonb_array_elements(public.ingresos_vendedores(tests.regional('LP'), public.hoy(), public.hoy(), true)) f
   where f ->> 'vendedor' = 'Flavia Rivera'),
  2, 'Con detalle: las notas del período de cada vendedor (incluida la anulada, marcada)');

-- Permisos -----------------------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 10)))$$),
  'NO_AUTORIZADO', 'Fernando no cobra en La Paz');
select tests.como('irene@coalsud.demo');
select is(tests.codigo_error($$select pg_temp.cobrar(jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 10)))$$),
  'NO_AUTORIZADO', 'El nacional no registra cobranzas (§11)');

select * from finish();
rollback;
