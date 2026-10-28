-- Cierre y reapertura del día (Contrato §5.4, Reglas §3.5). Casos: CP-06.5, CP-08.4, CP-08.7, CP-08.8, CP-08.9,
-- CP-08.11, §9.6 y ⚠ SUP-20/21.
begin;
select plan(22);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base) select 'QUINUA BLANCA 1KG', id, 44 from public.linea_comercial;
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id) values (tests.regional('LP'), 'Mi Super', 'supermercado', 'supermercado', tests.condicion('Contado'));

-- Anteayer: ingreso y una nota sin factura. Ayer: una nota con factura.
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy() - 2, null, tests.items('QUINUA BLANCA 1KG', 100));
select tests.emitir('LP', 'Mi Super', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 2, 44)), 0, 'almacen', public.hoy() - 2);
select public.emitir_nota_venta(tests.regional('LP'), public.hoy() - 1, tests.cliente('Mi Super'), tests.vendedor('Flavia Rivera'), null, null, 0, 'almacen', 'F-2', null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 3, 44)));

create function pg_temp.cerrar(p_dias int) returns jsonb language sql as $$ select public.cerrar_liquidacion(tests.regional('LP'), public.hoy() - p_dias) $$;

-- Días pendientes ----------------------------------------------------------------------------
select is(
  (select array_agg((public.hoy() - fecha) || ' días: ' || notas_sin_factura || ' sin factura' order by fecha) from public.dias_pendientes_cierre(tests.regional('LP'))),
  array['2 días: 1 sin factura', '1 días: 0 sin factura'], 'Días abiertos anteriores a hoy, con sus notas sin factura');

-- Validaciones del cierre ------------------------------------------------------------------------
select is(tests.detalle_error($$select pg_temp.cerrar(1)$$) -> 'fechas', jsonb_build_array(public.hoy() - 2),
  'Cerrar ayer con anteayer abierto: DIA_ANTERIOR_ABIERTO con la fecha pendiente (CP-08.11, ⚠ SUP-20)');
select is(jsonb_array_length(tests.detalle_error($$select pg_temp.cerrar(2)$$) -> 'notas'), 1,
  'Cerrar con una nota sin factura: FACTURA_PENDIENTE, listando la nota (CP-06.5, ⚠ SUP-06)');
select is(tests.codigo_error($$select pg_temp.cerrar(-1)$$), 'FECHA_INVALIDA', 'No se cierra un día futuro');

select public.registrar_factura_nota((select id from public.nota_venta where numero = 'LP-0001'), 'F-1', null);
select is((select r ->> 'estado' || ' ' || (r -> 'totales' ->> 'total_ventas') from pg_temp.cerrar(2) r), 'cerrada 88.00',
  'Con todo facturado, el día se cierra con sus totales (CP-08.4)');

-- Snapshot -------------------------------------------------------------------------------------
select is(
  (select r ->> 'estado' || ' por ' || (r ->> 'cerrada_por') || ' · ' || (r -> 'pie' ->> 'total_ventas') from public.reporte_liquidacion(tests.regional('LP'), public.hoy() - 2) r),
  'cerrada por Vanessa · 88.00', 'El reporte de un día cerrado sale del snapshot, con quién lo cerró');
select tests.como('irene@coalsud.demo');
update public.producto set precio_base = 50;
select tests.como('vanessa@coalsud.demo');
select is(
  (select p ->> 'precio_unit' from jsonb_array_elements(public.reporte_liquidacion(tests.regional('LP'), public.hoy() - 2) -> 'lineas' -> 0 -> 'productos') p),
  '44.00', 'El precio queda congelado: cambiar el catálogo no altera un día cerrado');
select is(tests.codigo_error($$select tests.emitir('LP', 'Mi Super', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44)), 0, 'almacen', public.hoy() - 2)$$),
  'DIA_CERRADO', 'Un día cerrado no admite notas nuevas (CP-08.7)');
select is(tests.codigo_error($$select pg_temp.cerrar(2)$$), 'DIA_CERRADO', 'Ni se cierra dos veces');
select is(pg_temp.cerrar(1) ->> 'estado', 'cerrada', 'Cerrado anteayer, ayer ya se puede cerrar');

-- Reapertura (⚠ SUP-21) -------------------------------------------------------------------------
select is(tests.codigo_error($$select public.reabrir_liquidacion(tests.regional('LP'), public.hoy() - 1, 'error')$$),
  'SOLO_NACIONAL', 'Un regional no reabre (CP-08.9, §9.6)');
select tests.como('irene@coalsud.demo');
select is(tests.detalle_error($$select public.reabrir_liquidacion(tests.regional('LP'), public.hoy() - 2, 'error')$$) ->> 'ultimo_cierre',
  (public.hoy() - 1)::text, 'Solo se reabre el último día cerrado: REAPERTURA_NO_PERMITIDA (CP-08.8)');
select is(tests.codigo_error($$select public.reabrir_liquidacion(tests.regional('LP'), public.hoy() - 1, ' ')$$),
  'VALIDACION', 'El motivo es obligatorio');
select is(public.reabrir_liquidacion(tests.regional('LP'), public.hoy() - 1, 'Faltó una cobranza') ->> 'estado', 'abierta',
  'El nacional reabre el último día');
select tests.como_postgres();
select is(
  (select (select count(*) from public.liquidacion_linea ll where ll.liquidacion_id = l.id) || '/' || coalesce(l.total_ventas::text, 'sin totales')
   from public.liquidacion l where l.regional_id = tests.regional('LP') and l.fecha = app.hoy() - 1),
  '0/sin totales', 'Reabrir borra el snapshot y los totales');
select is(
  (select jsonb_array_length(datos -> 'lineas') > 0 and (datos -> 'totales' ->> 'total_ventas')::numeric = 132 from public.auditoria where accion = 'reabrir_dia'),
  true, 'y la auditoría guarda lo que se borró');

select tests.como('vanessa@coalsud.demo');
select is((public.emitir_nota_venta(tests.regional('LP'), public.hoy() - 1, tests.cliente('Mi Super'), tests.vendedor('Flavia Rivera'), null, null, 0, 'almacen', 'F-3', null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44)))) ->> 'numero', 'LP-0003', 'Reabierto, el día admite la nota que faltaba');
select pg_temp.cerrar(1);
select is(pg_temp.cerrar(0) ->> 'estado', 'cerrada', 'Un día sin movimiento se crea y se cierra igual (carga inicial)');
select is(
  (select regional_codigo || ' ' || cerrada_por_nombre || ' ' || total_ventas from public.v_liquidacion where fecha = public.hoy() - 1),
  'LP Vanessa 176.00', 'v_liquidacion: el historial con regional, quién cerró y el total (132 + 44)');

-- Permisos -----------------------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$select public.cerrar_liquidacion(tests.regional('LP'), public.hoy())$$), 'NO_AUTORIZADO',
  'Fernando no cierra La Paz');
select tests.como('irene@coalsud.demo');
select is(tests.codigo_error($$select public.cerrar_liquidacion(tests.regional('LP'), public.hoy())$$), 'NO_AUTORIZADO',
  'El nacional no cierra días (§11)');
select tests.como_postgres();
select is((select count(*)::int from public.auditoria where accion = 'cerrar_dia'), 4, 'Cada cierre queda auditado');

select * from finish();
rollback;
