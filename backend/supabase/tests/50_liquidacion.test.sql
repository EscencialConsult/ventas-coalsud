-- Liquidación: matriz, totales y reporte (Reglas §3, Contrato §6.1), con el CASO DORADO F3 (CP-08.10):
-- La Paz, 11/06/2026. De la planilla hay 4 filas verificadas (Reglas §3.6); el resto de los productos se
-- reemplaza por "NO VERIFICADO F3" solo para que cada nota y los totales den lo que da la planilla.
begin;
select plan(18);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre, orden) values ('COMRURAL', 1), ('OTROS (NO VERIFICADO)', 99);
insert into public.producto (nombre, linea_id, orden, precio_base)
select p.nombre, l.id, p.orden, p.precio
from (values
  ('COMRURAL', 'QUINUA TRICOLOR 1 KG', 2, 44), ('COMRURAL', 'QUINUA BLANCA 1KG', 3, 44), ('COMRURAL', 'JUGO QUINUA MANZANA 300ML', 21, 7),
  ('COMRURAL', 'BARRA DE CHOCOLATE 30GR', 24, 4.5), ('COMRURAL', 'CHIA 200GR', 1, 31.5), ('OTROS (NO VERIFICADO)', 'NO VERIFICADO F3', 1, 1)
) p (linea, nombre, orden, precio)
join public.linea_comercial l on l.nombre = p.linea;
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id) values
  (tests.regional('LP'), 'Mi Super', 'supermercado', 'supermercado', tests.condicion('Contado')),
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'));

create function pg_temp.items(p jsonb) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('producto_id', tests.producto(e ->> 0), 'cantidad', (e ->> 1)::numeric, 'precio_aplicado', (e ->> 2)::numeric))
  from jsonb_array_elements(p) e
$$;
create function pg_temp.nota(p_cliente text, p_factura text, p jsonb) returns jsonb language sql as $$
  select public.emitir_nota_venta(tests.regional('LP'), '2026-06-11', tests.cliente(p_cliente), tests.vendedor('Flavia Rivera'), null, null, 0, 'almacen', p_factura, null, pg_temp.items(p))
$$;
-- fila de la matriz como en la planilla: SI/Pedido/Trasp/ContQ/ContBs/CredQ/CredBs/SF/TotQ/TotBs
create function pg_temp.fila(p_producto text) returns text language sql as $$
  select concat_ws('/', p ->> 'saldo_inicial', p ->> 'pedido', p ->> 'traspaso', p ->> 'venta_contado_q', p ->> 'venta_contado_bs',
    p ->> 'venta_credito_q', p ->> 'venta_credito_bs', p ->> 'saldo_final', p ->> 'total_ventas_q', p ->> 'total_ventas_bs')
  from jsonb_array_elements(public.reporte_liquidacion(tests.regional('LP'), '2026-06-11') -> 'lineas') l, jsonb_array_elements(l -> 'productos') p
  where p ->> 'producto' = p_producto
$$;

-- 10/06: saldos iniciales (LP) y stock de SCZ para los traspasos; el día se cierra
select tests.como('vanessa@coalsud.demo');
select public.registrar_ajuste(tests.almacen('LP'), '2026-06-10', 'inventario_inicial', pg_temp.items(
  '[["QUINUA TRICOLOR 1 KG", 15, 0], ["QUINUA BLANCA 1KG", 22, 0], ["JUGO QUINUA MANZANA 300ML", 50, 0], ["BARRA DE CHOCOLATE 30GR", 92, 0], ["NO VERIFICADO F3", 10000, 0]]'));
select tests.como('fernando@coalsud.demo');
select public.registrar_ingreso(tests.almacen('SCZ'), '2026-06-10', null, pg_temp.items('[["JUGO QUINUA MANZANA 300ML", 100, 0], ["BARRA DE CHOCOLATE 30GR", 100, 0]]'));
select tests.como_postgres();
update public.liquidacion set estado = 'cerrada', total_ventas = 0, total_efectivo = 0 where regional_id = tests.regional('LP') and fecha = '2026-06-10';

-- 11/06: pedido, traspasos desde SCZ y las 4 notas de la planilla (270.00 + 1,224.60 + 375.00 + 2,430.40)
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), '2026-06-11', 'Pedido', pg_temp.items('[["QUINUA BLANCA 1KG", 5, 0]]'));
select tests.como('fernando@coalsud.demo');
select public.registrar_traspaso(tests.almacen('SCZ'), tests.almacen('LP'), '2026-06-11', null,
  pg_temp.items('[["JUGO QUINUA MANZANA 300ML", 5, 0], ["BARRA DE CHOCOLATE 30GR", 11, 0]]'));
select tests.como('vanessa@coalsud.demo');
select pg_temp.nota('Mi Super', 'F-1462', '[["BARRA DE CHOCOLATE 30GR", 60, 4.5]]');
select pg_temp.nota('Hipermaxi La Paz', 'F-1463',
  '[["QUINUA TRICOLOR 1 KG", 6, 44], ["JUGO QUINUA MANZANA 300ML", 6, 6.5], ["BARRA DE CHOCOLATE 30GR", 30, 4.5], ["NO VERIFICADO F3", 786.60, 1]]');
select pg_temp.nota('Mi Super', 'F-1464', '[["JUGO QUINUA MANZANA 300ML", 20, 7], ["NO VERIFICADO F3", 235, 1]]');
select pg_temp.nota('Mi Super', 'F-1465', '[["QUINUA TRICOLOR 1 KG", 9, 44], ["QUINUA BLANCA 1KG", 24, 44], ["NO VERIFICADO F3", 978.40, 1]]');

-- Caso dorado: las 4 filas verificadas ---------------------------------------------------------
select is(pg_temp.fila('QUINUA TRICOLOR 1 KG'), '15.00/0.00/0.00/9.00/396.00/6.00/264.00/0.00/15.00/660.00',
  'F3 · Quinua Tricolor 1 kg: 15 − 9 − 6 = 0');
select is(pg_temp.fila('QUINUA BLANCA 1KG'), '22.00/5.00/0.00/24.00/1056.00/0.00/0.00/3.00/24.00/1056.00',
  'F3 · Quinua Blanca 1 kg: 22 + 5 − 24 = 3');
select is(pg_temp.fila('JUGO QUINUA MANZANA 300ML'), '50.00/0.00/5.00/20.00/140.00/6.00/39.00/29.00/26.00/179.00',
  'F3 · Jugo Quinua Manzana: 50 + 5 − 20 − 6 = 29 (crédito a 6.50: Bs ≠ Q × P/U, y es correcto)');
select is(pg_temp.fila('BARRA DE CHOCOLATE 30GR'), '92.00/0.00/11.00/60.00/270.00/30.00/135.00/13.00/90.00/405.00',
  'F3 · Barra de Chocolate 30 gr: 92 + 11 − 60 − 30 = 13');

-- Caso dorado: totales de la planilla ------------------------------------------------------------
create temporary table r on commit drop as select public.reporte_liquidacion(tests.regional('LP'), '2026-06-11') as j;
grant select on r to authenticated;
select is((select concat_ws('/', j -> 'pie' ->> 'contado_bruto', j -> 'pie' ->> 'credito_bruto', j -> 'pie' ->> 'total_ventas') from r),
  '3075.40/1224.60/4300.00', 'F3 · Contado 3,075.40 · Crédito 1,224.60 · Total Ventas 4,300.00');
select is((select concat_ws('/', j -> 'arqueo' ->> 'cobranzas', j -> 'arqueo' ->> 'total_efectivo') from r),
  '0.00/3075.40', 'F3 · Cobranzas 0 · Total Efectivo 3,075.40');
select is((select array_agg(n ->> 'numero_factura' || ' ' || (n ->> 'total')) from r, jsonb_array_elements(j -> 'notas') n),
  array['F-1462 270.00', 'F-1463 1224.60', 'F-1464 375.00', 'F-1465 2430.40'], 'F3 · Detalle de notas por N° de factura');
select is((select concat_ws('/', j -> 'subtotales_notas' ->> 'contado', j -> 'subtotales_notas' ->> 'credito', j -> 'subtotales_notas' ->> 'total', j -> 'subtotales_notas' ->> 'cantidad') from r),
  '3075.40/1224.60/4300.00/4', 'Los subtotales del detalle cuadran con el pie');

-- Reglas de la matriz ---------------------------------------------------------------------------
select tests.como_postgres();
select is(
  (select count(*)::int from r, jsonb_array_elements(j -> 'lineas') l, jsonb_array_elements(l -> 'productos') p
   where (p ->> 'saldo_final')::numeric <> (select coalesce(sum(m.cantidad), 0) from public.movimiento_inventario m
     where m.regional_id = tests.regional('LP') and m.producto_id = (p ->> 'producto_id')::uuid and m.fecha <= '2026-06-11')),
  0, 'Invariante: Saldo Final = Σ movimientos hasta el día, en todas las filas (Reglas §3.1)');
select tests.como('vanessa@coalsud.demo');
select is((select p ->> 'con_movimiento' || '/' || (p ->> 'saldo_final') from r, jsonb_array_elements(j -> 'lineas') l, jsonb_array_elements(l -> 'productos') p where p ->> 'producto' = 'CHIA 200GR'),
  'false/0.00', 'Un activo sin movimiento figura, marcado sin movimiento (para plegarlo)');
select is((select array_agg(l ->> 'linea') from r, jsonb_array_elements(j -> 'lineas') l),
  array['COMRURAL', 'OTROS (NO VERIFICADO)'], 'Agrupado por línea, en el orden del catálogo');
select is((select array_agg(p ->> 'producto') from r, jsonb_array_elements(j -> 'lineas' -> 0 -> 'productos') p),
  array['CHIA 200GR', 'QUINUA TRICOLOR 1 KG', 'QUINUA BLANCA 1KG', 'JUGO QUINUA MANZANA 300ML', 'BARRA DE CHOCOLATE 30GR'],
  'y dentro de la línea, en el orden de los productos');
select is((select j -> 'columnas_extra' from r), '{"ajuste": false, "devolucion": false}'::jsonb,
  'Sin devoluciones ni ajustes del día, esas columnas no se muestran (⚠ SUP-10)');
select is((select concat_ws('/', j ->> 'estado', j ->> 'ultimo_cerrado', jsonb_array_length(j -> 'validaciones_cierre' -> 'notas_sin_factura')) from r),
  'abierta/2026-06-10/0', 'Día abierto, último cierre el 10/06 y sin facturas pendientes');

-- Cobranzas y reembolsos en el arqueo ----------------------------------------------------------
select public.registrar_cobranzas(tests.regional('LP'), '2026-06-11', 'transferencia', 'TRF-1', null,
  jsonb_build_array(jsonb_build_object('tipo_doc', 'nota', 'documento_id', (select id from public.nota_venta where numero_factura = 'F-1463'), 'importe', 500)));
select is(
  (select concat_ws('/', x -> 'arqueo' ->> 'cobranzas', x -> 'arqueo' ->> 'total_efectivo', x -> 'arqueo' -> 'cobranzas_por_forma' -> 0 ->> 'forma_pago', x -> 'cobranzas' -> 0 ->> 'documento')
   from public.reporte_liquidacion(tests.regional('LP'), '2026-06-11') x),
  '500.00/3575.40/transferencia/LP-0002 / F-1463', 'Total Efectivo = contado + cobranzas del día (⚠ SUP-12), con el desglose por forma de pago');
select public.registrar_ajuste(tests.almacen('LP'), '2026-06-11', 'rotura', pg_temp.items('[["BARRA DE CHOCOLATE 30GR", -1, 0]]'));
select is((select x -> 'columnas_extra' ->> 'ajuste' from public.reporte_liquidacion(tests.regional('LP'), '2026-06-11') x), 'true',
  'Con un ajuste en el día, aparece la columna Ajuste');

-- Permisos -----------------------------------------------------------------------------------
select tests.como('fernando@coalsud.demo');
select is(tests.codigo_error($$select public.reporte_liquidacion(tests.regional('LP'), '2026-06-11')$$), 'NO_AUTORIZADO',
  'Fernando no ve el reporte de La Paz');
select tests.como('irene@coalsud.demo');
select is((select x -> 'pie' ->> 'total_ventas' from public.reporte_liquidacion(tests.regional('LP'), '2026-06-11') x), '4300.00',
  'El nacional ve el reporte de cualquier regional');

select * from finish();
rollback;
