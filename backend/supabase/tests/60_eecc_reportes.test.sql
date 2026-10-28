-- EECC, reportes, presupuesto, dashboard, avisos y auditoría (Contrato §6, Reglas §6, §8–10).
-- Casos: CP-09.2, CP-09.3, CP-09.4, CP-10.1, CP-10.2, CP-10.3, CP-11.1, CP-11.3 (capa BD).
-- CP-12.2 (cartera de F4: 201,015.92) queda pendiente de la planilla del cliente: acá la cartera es sintética.
begin;
select plan(48);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base, stock_minimo)
select p.nombre, l.id, p.precio, p.minimo from public.linea_comercial l,
  (values ('QUINUA BLANCA 1KG', 44, 0), ('CHIA 200GR', 30, 100)) p (nombre, precio, minimo);
insert into public.vendedor (regional_id, nombre) values
  (tests.regional('LP'), 'Flavia Rivera'), (tests.regional('LP'), 'Arturo Reynaga'), (tests.regional('SCZ'), 'Mario Condori');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id, vendedor_id) values
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'), tests.vendedor('Flavia Rivera')),
  (tests.regional('LP'), 'Ketal', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'), tests.vendedor('Flavia Rivera')),
  (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', tests.condicion('Contado'), tests.vendedor('Arturo Reynaga')),
  (tests.regional('SCZ'), 'Fidalga S.A. SCZ', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'), tests.vendedor('Mario Condori'));

create function pg_temp.cartera(p_cliente text, p_numero text, p_fecha date, p_vence date, p_importe numeric) returns jsonb language sql as $$
  select jsonb_build_object('cliente_id', tests.cliente(p_cliente), 'numero_documento', p_numero,
    'fecha_documento', p_fecha, 'fecha_vencimiento', p_vence, 'importe', p_importe)
$$;
create function pg_temp.doc(p_numero text) returns uuid language sql as $$
  select coalesce((select id from public.nota_venta where numero = p_numero), (select id from public.cxc_saldo_inicial where numero_documento = p_numero))
$$;
create function pg_temp.aplicacion(p_tipo text, p_numero text, p_importe numeric) returns jsonb language sql as $$
  select jsonb_build_object('tipo_doc', p_tipo, 'documento_id', pg_temp.doc(p_numero), 'importe', p_importe)
$$;

-- Cartera inicial (nacional): LP F-1001 (2025, vencida), F-1002 (junio); SCZ F-2001 (marzo, vencida)
select tests.como('irene@coalsud.demo');
select public.cargar_cartera_inicial(tests.regional('LP'), jsonb_build_array(
  pg_temp.cartera('Hipermaxi La Paz', 'F-1001', '2025-12-15', '2026-01-14', 1000),
  pg_temp.cartera('Ketal', 'F-1002', '2026-06-01', '2026-07-01', 500)));
select public.cargar_cartera_inicial(tests.regional('SCZ'), jsonb_build_array(
  pg_temp.cartera('Fidalga S.A. SCZ', 'F-2001', '2026-03-10', '2026-04-09', 300)));

-- LP: LP-0001 20/05 crédito 440 · LP-0002 05/05 crédito 300 · LP-0003 10/06 contado 88 · LP-0004 12/06 crédito 220
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), '2026-05-01', null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 100, 0), tests.item_nota('CHIA 200GR', 100, 0)));
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 10, 44)), 0, 'almacen', '2026-05-20');
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 10, 30)), 0, 'almacen', '2026-05-05');
select tests.emitir('LP', 'Macro Abasto', 'Arturo Reynaga', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 2, 44)), 0, 'almacen', '2026-06-10');
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 5, 44)), 0, 'almacen', '2026-06-12');
-- cobros: 01/06 LP-0002 100 + F-1001 400 · 15/06 LP-0001 40 (después del corte del 11/06)
select public.registrar_cobranzas(tests.regional('LP'), '2026-06-01', 'efectivo', null, null,
  jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0002', 100), pg_temp.aplicacion('saldo_inicial', 'F-1001', 400)));
select public.registrar_cobranzas(tests.regional('LP'), '2026-06-15', 'transferencia', null, null,
  jsonb_build_array(pg_temp.aplicacion('nota', 'LP-0001', 40)));

-- SCZ: SCZ-0001 05/06 crédito 132 y cobro de F-2001 por 50
select tests.como('fernando@coalsud.demo');
select public.registrar_ingreso(tests.almacen('SCZ'), '2026-05-01', null, jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 50, 0)));
select tests.emitir('SCZ', 'Fidalga S.A. SCZ', 'Mario Condori', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 3, 44)), 0, 'almacen', '2026-06-05');
select public.registrar_cobranzas(tests.regional('SCZ'), '2026-06-05', 'efectivo', null, null,
  jsonb_build_array(pg_temp.aplicacion('saldo_inicial', 'F-2001', 50)));

-- Días de LP cerrados hasta el 15/06; hoy: devolución con abono de 3 de LP-0001 (132.00)
select tests.como_postgres();
update public.liquidacion set estado = 'cerrada', total_ventas = 0, total_efectivo = 0
where regional_id = tests.regional('LP') and fecha <= '2026-06-15';
select tests.como('vanessa@coalsud.demo');
select public.registrar_devolucion(pg_temp.doc('LP-0001'), 'abono_cuenta', 'producto dañado',
  jsonb_build_array(jsonb_build_object('producto_id', tests.producto('QUINUA BLANCA 1KG'), 'cantidad', 3)));

-- EECC (CP-10.2, CP-10.3) ---------------------------------------------------------------------
select is(tests.codigo_error($$select public.eecc_consolidado('2026-06-11')$$), 'SOLO_NACIONAL', 'Un regional no ve el EECC (CP-10.3)');

select tests.como('irene@coalsud.demo');
create temporary table eecc on commit drop as select public.eecc_consolidado('2026-06-11') as e;
create function pg_temp.fila(p_cliente text) returns jsonb language sql as $$
  select c from eecc, jsonb_array_elements(e -> 'grupos') g, jsonb_array_elements(g -> 'clientes') c where c ->> 'cliente' = p_cliente
$$;

select is((select e -> 'columnas' -> 0 from eecc), '{"clave": "anterior", "etiqueta": "2025"}'::jsonb, 'Primera columna: el año anterior acumulado');
select is((select e -> 'columnas' -> -1 from eecc), '{"clave": "2026-06", "etiqueta": "JUNIO"}'::jsonb, 'Última columna: el mes de corte');
select is((select jsonb_array_length(e -> 'columnas') from eecc), 7, 'Año anterior + enero a junio');
select is(
  (select f -> 'saldos' ->> 'anterior' || ' ' || (f -> 'saldos' ->> '2026-05') || ' ' || (f -> 'saldos' ->> '2026-06') || ' ' || (f ->> 'total')
   from pg_temp.fila('Hipermaxi La Paz') f),
  '600.00 640.00 0.00 1240.00',
  'Hipermaxi: cartera 2025 menos cobro (600), mayo = 440 + 300 − 100, la nota del 12/06 queda fuera del corte');
select is((select f ->> 'vencido' || ' ' || (f ->> 'max_dias_mora') || ' ' || (f ->> 'vendedor') from pg_temp.fila('Hipermaxi La Paz') f),
  '800.00 148 Flavia Rivera', 'Vencido = F-1001 + LP-0002; mora máxima desde el 14/01; vendedor del cliente');
select is((select f -> 'saldos' ->> '2026-06' || ' ' || (f ->> 'vencido') from pg_temp.fila('Ketal') f), '500.00 0.00', 'Ketal: cartera de junio, sin vencer');
select is((select f -> 'saldos' ->> '2026-03' || ' ' || (f -> 'saldos' ->> '2026-06') || ' ' || (f ->> 'total') || ' ' || (f ->> 'max_dias_mora')
           from pg_temp.fila('Fidalga S.A. SCZ') f),
  '250.00 132.00 382.00 63', 'Fidalga: cartera de marzo menos cobro, nota de junio, mora 63 días');
select is(pg_temp.fila('Macro Abasto'), null, 'Las notas al contado no generan cuenta por cobrar');
select is((select array_agg(g ->> 'regional' || '/' || (g ->> 'categoria') || '/' || (g -> 'subtotal' ->> 'total'))
           from eecc, jsonb_array_elements(e -> 'grupos') g),
  array['LA PAZ/supermercado/1740.00', 'SANTA CRUZ/supermercado/382.00'], 'Grupos regional → categoría con su subtotal');
select is((select e -> 'total_general' ->> 'total' || ' ' || (e -> 'total_general' ->> 'anterior') || ' ' || (e -> 'total_general' ->> '2026-06') from eecc),
  '2122.00 600.00 632.00', 'SALDO ACTUAL por columna y total');
select is((select e -> 'kpis' from eecc), '{"saldo_total": 2122.00, "vencido": 1050.00, "clientes_con_saldo": 3, "clientes_en_mora": 2}'::jsonb,
  'KPIs de cabecera');
select is((public.eecc_consolidado('2026-06-11', tests.regional('LP')) -> 'total_general' ->> 'total'), '1740.00', 'Filtro por regional');
select is(jsonb_array_length(public.eecc_consolidado('2026-06-11', null, 'mayorista') -> 'grupos'), 0, 'Filtro por categoría');
select is((public.eecc_consolidado(public.hoy(), tests.regional('LP')) -> 'total_general' ->> 'total'), '1788.00',
  'A hoy: el cobro del 15/06, el abono de la devolución y la nota del 12/06 (600 + 268 + 200 + 220 + 500)');

-- Reportes comerciales (CP-10.1) --------------------------------------------------------------
select tests.como('vanessa@coalsud.demo');
select is((select array_agg(cliente || ' ' || ventas_netas || ' ' || notas order by ventas_netas desc)
           from public.reporte_top_clientes('2026-05-01', '2026-06-30')),
  array['Hipermaxi La Paz 960.00 3', 'Macro Abasto 88.00 1'], 'Top clientes de las regionales del usuario');
select is((select ventas_netas from public.reporte_top_clientes('2026-05-01', public.hoy()) where cliente = 'Hipermaxi La Paz'), 828.00,
  'Ventas netas: restan las devoluciones del período (960 − 132)');
select is((select array_agg(cliente) from public.reporte_top_clientes('2026-05-01', '2026-06-30', null, null, 'mayorista')),
  array['Macro Abasto'], 'Top clientes por categoría');
select is((select array_agg(cliente) from public.reporte_top_clientes('2026-05-01', '2026-06-30', null, tests.vendedor('Flavia Rivera'))),
  array['Hipermaxi La Paz'], 'Top clientes por vendedor');
select tests.como('fernando@coalsud.demo');
select is((select array_agg(cliente || ' ' || ventas_netas) from public.reporte_top_clientes('2026-05-01', '2026-06-30')),
  array['Fidalga S.A. SCZ 132.00'], 'Fernando solo ve Santa Cruz');

select tests.como('vanessa@coalsud.demo');
select is((select array_agg(producto || ' ' || unidades || ' ' || bs_netos order by bs_netos desc)
           from public.reporte_productos_vendidos('2026-05-01', public.hoy())),
  array['QUINUA BLANCA 1KG 14.00 616.00', 'CHIA 200GR 10.00 300.00'], 'Productos más vendidos, netos de devoluciones');
select is((select count(*)::int from public.reporte_productos_vendidos('2026-05-01', public.hoy(), null, gen_random_uuid())), 0, 'Filtro por línea');

select is((select vendidas || ' ' || stock_inicial || ' ' || stock_final || ' ' || stock_promedio || ' ' || rotacion || ' ' || dias_inventario
           from public.reporte_rotacion(tests.regional('LP'), '2026-06-01', '2026-06-30') where producto = 'QUINUA BLANCA 1KG'),
  '7.00 90.00 83.00 86.50 0.08 371', 'Rotación = vendidas / stock promedio; días de inventario = 30 / rotación (⚠ SUP-35)');
select is((select rotacion || ' ' || coalesce(dias_inventario::text, 'nulo') from public.reporte_rotacion(tests.regional('LP'), '2026-06-01', '2026-06-30')
           where producto = 'CHIA 200GR'), '0.00 nulo', 'Sin ventas: rotación 0 y días de inventario vacío');

select tests.como('irene@coalsud.demo');
select is((select array_agg(regional || ' ' || mes || ' ' || ventas_netas order by mes, regional) from public.reporte_ventas_regional('2026-05-01', '2026-06-30')),
  array['Cochabamba 2026-05 0.00', 'La Paz 2026-05 740.00', 'Santa Cruz 2026-05 0.00',
        'Cochabamba 2026-06 0.00', 'La Paz 2026-06 308.00', 'Santa Cruz 2026-06 132.00'],
  'Ventas por regional y mes: el nacional ve las tres');
select tests.como('vanessa@coalsud.demo');
select is((select count(*)::int from public.reporte_ventas_regional('2026-05-01', '2026-06-30')), 2, 'El regional ve solo sus regionales (⚙ DT-33)');

-- Movimiento por período (⚠ SUP-54) ------------------------------------------------------------
create temporary table mov on commit drop as select public.reporte_movimiento_periodo(tests.regional('LP'), '2026-05-01', '2026-06-30') as m;
create function pg_temp.producto_mov(p_nombre text) returns jsonb language sql as $$
  select p from mov, jsonb_array_elements(m -> 'lineas') l, jsonb_array_elements(l -> 'productos') p where p ->> 'producto' = p_nombre
$$;
select is((select concat_ws(' ', p ->> 'saldo_inicial', p ->> 'pedido', p ->> 'pedido_bs', p ->> 'venta_contado_q', p ->> 'venta_credito_q',
                            p ->> 'total_ventas_bs', p ->> 'saldo_final', p ->> 'saldo_final_bs') from pg_temp.producto_mov('QUINUA BLANCA 1KG') p),
  '0 100.00 4400.00 2.00 15.00 748.00 83.00 3652.00', 'Quinua en el período: columnas en Q y en Bs');
select is((select count(*)::int from mov, jsonb_array_elements(m -> 'lineas') l, jsonb_array_elements(l -> 'productos') p
           where (p ->> 'saldo_final')::numeric <> (select coalesce(sum(x.cantidad), 0) from public.movimiento_inventario x
                                                   where x.regional_id = tests.regional('LP') and x.producto_id = (p ->> 'producto_id')::uuid and x.fecha <= '2026-06-30')),
  0, 'Saldo final = Σ movimientos al fin del período');
select is((select m -> 'pie' from mov),
  '{"contado_bruto": 88.00, "credito_bruto": 960.00, "descuento_contado": 0.00, "descuento_credito": 0.00, "contado_neto": 88.00,
    "credito_neto": 960.00, "total_ventas": 1048.00, "cobranzas": 540.00, "reembolsos": 0}'::jsonb,
  'Pie: ventas, descuentos, cobranzas y reembolsos del período');
select is(tests.codigo_error($$select public.reporte_movimiento_periodo(tests.regional('LP'), '2026-06-30', '2026-05-01')$$), 'VALIDACION', 'Rango invertido');
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$select public.reporte_movimiento_periodo(tests.regional('LP'), '2026-05-01', '2026-06-30')$$), 'NO_AUTORIZADO',
  'Otra regional');

-- Presupuesto (CP-09.2 a CP-09.4) ---------------------------------------------------------------
select tests.como('vanessa@coalsud.demo');
insert into public.presupuesto (periodo, regional_id, vendedor_id, categoria_cliente, meta) values
  ('2026-05', tests.regional('LP'), null, null, 1000),
  ('2026-06', tests.regional('LP'), tests.vendedor('Flavia Rivera'), null, 200),
  ('2026-06', tests.regional('LP'), null, 'mayorista', 100),
  (to_char(public.hoy(), 'YYYY-MM'), tests.regional('LP'), null, null, 1000);
select is((select count(*)::int from public.presupuesto where usuario_id = tests.id_de('vanessa@coalsud.demo')), 4,
  'La meta queda a nombre de quien la carga (⚙ DT-35)');
select is(tests.codigo_error($$insert into public.presupuesto (periodo, regional_id, meta) values ('2026-05', tests.regional('LP'), 5)$$), '23505',
  'Meta duplicada (CP-09.3)');
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$insert into public.presupuesto (periodo, regional_id, meta) values ('2026-07', tests.regional('LP'), 5)$$), '42501',
  'Fernando no carga metas de LP (CP-09.4)');

select tests.como('vanessa@coalsud.demo');
select is((select concat_ws(' ', "real", cumplimiento_pct, proyeccion, estado) from public.cumplimiento_presupuesto('2026-05')),
  '740.00 74.00 740.00 no_cumplido', 'Mes cerrado: real, cumplimiento, proyección y estado (CP-09.2)');
select is((select array_agg(coalesce(vendedor, categoria) || ' ' || "real" || ' ' || estado) from public.cumplimiento_presupuesto('2026-06', tests.regional('LP'))),
  array['mayorista 88.00 no_cumplido', 'Flavia Rivera 220.00 cumplido'], 'Metas por categoría y por vendedor');
select is((select estado || ' ' || proyeccion from public.cumplimiento_presupuesto(to_char(public.hoy(), 'YYYY-MM'))),
  'bajo ' || round(-132.00 / extract(day from public.hoy()) * extract(day from (date_trunc('month', public.hoy()) + interval '1 month - 1 day')), 2),
  'Mes en curso: proyección lineal (real / días transcurridos × días del mes)');

-- Dashboard y avisos ----------------------------------------------------------------------------
select is((select concat_ws(' ', k ->> 'ventas_hoy', k ->> 'ventas_periodo', k ->> 'variacion_pct', jsonb_array_length(k -> 'serie'), (k ? 'cxc')::text)
           from public.dashboard_kpis(tests.regional('LP'), '2026-06-01', '2026-06-30') k),
  '-132.00 308.00 -58.38 30 false', 'KPIs con rango: hoy, período, variación vs los 30 días anteriores, serie; sin CxC para el regional');
select is((select s -> 'ventas' from public.dashboard_kpis(null, '2026-06-01', '2026-06-30') k, jsonb_array_elements(k -> 'serie') s
           where s ->> 'fecha' = '2026-06-10'), '88.00'::jsonb, 'Serie: ventas netas del día');
select is((select jsonb_array_length(k -> 'serie') from public.dashboard_kpis(null) k), extract(day from public.hoy())::int,
  'Sin rango: el mes en curso hasta hoy');
select is(tests.codigo_error($$select public.dashboard_kpis(null, '2026-06-30', '2026-06-01')$$), 'VALIDACION', 'Rango invertido');
select tests.como('irene@coalsud.demo');
select is((select k -> 'cxc' from public.dashboard_kpis(null) k), '{"saldo": 2170.00, "vencido": 2170.00}'::jsonb, 'CxC a hoy, solo para el nacional');

select is((select a ->> 'bajo_minimo' from public.avisos_shell(null) a), '3', 'Nacional: la chía bajo mínimo en los tres almacenes');
select tests.como('vanessa@coalsud.demo');
select is((select concat_ws(' ', a ->> 'bajo_minimo', a ->> 'notas_sin_factura', a -> 'dias_pendientes') from public.avisos_shell(null) a),
  '1 4 []', 'Vanessa: bajo mínimo, notas sin factura y ningún día pendiente');
select tests.como('fernando@coalsud.demo');
select is((select a -> 'dias_pendientes' from public.avisos_shell(tests.regional('SCZ')) a),
  jsonb_build_array(
    jsonb_build_object('regional_id', tests.regional('SCZ'), 'fecha', '2026-05-01', 'notas_sin_factura', 0),
    jsonb_build_object('regional_id', tests.regional('SCZ'), 'fecha', '2026-06-05', 'notas_sin_factura', 1)),
  'Días anteriores abiertos con sus notas sin factura');

-- Auditoría (CP-11.1, CP-11.3) -----------------------------------------------------------------
select tests.como('irene@coalsud.demo');
select is((select usuario_nombre || ' ' || regional_codigo || ' ' || registro from public.v_auditoria where accion = 'emitir_nota' order by id limit 1),
  'Vanessa LP LP-0001', 'v_auditoria: usuario, regional y N° de la nota');
select is((select array_agg(accion || ' ' || registro order by id) from public.v_auditoria where entidad in ('cxc_saldo_inicial', 'presupuesto', 'devolucion')),
  array['cargar_cartera_inicial La Paz', 'cargar_cartera_inicial Santa Cruz', 'registrar_devolucion DEV-LP-0001',
        'crear 2026-05', 'crear 2026-06', 'crear 2026-06', 'crear ' || to_char(public.hoy(), 'YYYY-MM')],
  'Registro legible de cartera, devoluciones y metas');
select tests.como('vanessa@coalsud.demo');
select is((select count(*)::int from public.v_auditoria), 0, 'Un regional no ve la auditoría (CP-11.3)');

select * from finish();
rollback;
