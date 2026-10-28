-- Invariantes de integridad (Estrategia de Pruebas §4) sobre un escenario con todas las operaciones:
-- ingreso, salida, retorno, traspaso, ajuste, ventas (almacén y vendedor), anulación, cierre, cobranza y devolución.
begin;
select plan(18);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('irene@coalsud.demo', 'nacional');
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0), ('Crédito 30 días', 'credito', 30);
insert into public.linea_comercial (nombre) values ('COMRURAL');
insert into public.producto (nombre, linea_id, precio_base)
select p.nombre, l.id, p.precio from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', 44), ('CHIA 200GR', 30)) p (nombre, precio);
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id) values
  (tests.regional('LP'), 'Macro Abasto', 'mayorista', 'ruta', tests.condicion('Contado')),
  (tests.regional('LP'), 'Hipermaxi La Paz', 'supermercado', 'supermercado', tests.condicion('Crédito 30 días'));

-- Anteayer (D1): todas las operaciones de inventario y cuatro notas (una anulada); se cierra.
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy() - 2, null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 100, 0), tests.item_nota('CHIA 200GR', 50, 0)));
select public.registrar_salida(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy() - 2, null, tests.items('QUINUA BLANCA 1KG', 20));
select public.registrar_retorno(tests.almacen('LP'), tests.vendedor('Flavia Rivera'), public.hoy() - 2, null, tests.items('QUINUA BLANCA 1KG', 5));
select public.registrar_traspaso(tests.almacen('LP'), tests.almacen('SCZ'), public.hoy() - 2, null, tests.items('QUINUA BLANCA 1KG', 10));
select public.registrar_ajuste(tests.almacen('LP'), public.hoy() - 2, 'Merma: bolsa rota', tests.items('CHIA 200GR', -2));
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 5, 44)), 0, 'almacen', public.hoy() - 2);
select tests.emitir('LP', 'Hipermaxi La Paz', 'Flavia Rivera', jsonb_build_array(tests.item_nota('CHIA 200GR', 3, 30)), 10, 'almacen', public.hoy() - 2);
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 2, 44)), 0, 'vendedor', public.hoy() - 2);
select tests.emitir('LP', 'Macro Abasto', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44)), 0, 'almacen', public.hoy() - 2);
select public.anular_nota_venta((select id from public.nota_venta where numero = 'LP-0004'), 'Cliente ausente');
select public.registrar_factura_nota(id, 'F-' || right(numero, 1), null) from public.nota_venta where estado = 'emitida';
select public.cerrar_liquidacion(tests.regional('LP'), public.hoy() - 2);

-- Ayer (D2): cobro parcial de la nota a crédito; se cierra. Hoy: devolución con reembolso de la nota contado.
select public.registrar_cobranzas(tests.regional('LP'), public.hoy() - 1, 'efectivo', null, null,
  jsonb_build_array(jsonb_build_object('tipo_doc', 'nota', 'documento_id', (select id from public.nota_venta where numero = 'LP-0002'), 'importe', 50)));
select public.cerrar_liquidacion(tests.regional('LP'), public.hoy() - 1);
select public.registrar_devolucion((select id from public.nota_venta where numero = 'LP-0001'), 'reembolso', 'producto dañado', tests.items('QUINUA BLANCA 1KG', 1));

select tests.como_postgres();

-- 1 · Stock ------------------------------------------------------------------------------------
select is((select count(*)::int from app.verificar_stock()), 0, 'verificar_stock: saldo de la tabla = Σ movimientos');
update public.stock_saldo set cantidad = cantidad + 1 where vendedor_id is null and producto_id = tests.producto('CHIA 200GR') and almacen_id = tests.almacen('LP');
select is((select saldo_tabla - saldo_movimientos from app.verificar_stock()), 1.00, 'verificar_stock detecta una diferencia');
update public.stock_saldo set cantidad = cantidad - 1 where vendedor_id is null and producto_id = tests.producto('CHIA 200GR') and almacen_id = tests.almacen('LP');

-- 2–4 · Liquidaciones cerradas -----------------------------------------------------------------
select is((select count(*)::int from public.liquidacion where estado = 'cerrada'), 2, 'Dos días cerrados para verificar');
select is((
  select count(*)::int from public.liquidacion_linea ll join public.liquidacion l on l.id = ll.liquidacion_id
  where ll.saldo_final <> (select coalesce(sum(m.cantidad), 0) from public.movimiento_inventario m
                           where m.regional_id = l.regional_id and m.producto_id = ll.producto_id and m.fecha <= l.fecha)),
  0, 'Saldo final = Σ movimientos con fecha ≤ D');
select is((
  select count(*)::int from public.liquidacion_linea
  where saldo_final <> saldo_inicial + pedido + traspaso + devolucion + ajuste - total_ventas_q), 0, 'Identidad del día');
select is((
  select count(*)::int from public.liquidacion where estado = 'cerrada'
    and (total_efectivo <> total_contado_bruto - descuento_contado + total_cobranzas - total_reembolsos
         or total_ventas <> total_contado_bruto - descuento_contado + total_credito_bruto - descuento_credito)),
  0, 'Arqueo: total efectivo y total ventas');

-- 5–6 · Movimientos espejo ---------------------------------------------------------------------
select is((
  select count(*)::int from (
    select m.documento_id, m.producto_id from public.movimiento_inventario m join public.documento_inventario d on d.id = m.documento_id
    where d.tipo = 'traspaso' group by 1, 2 having sum(m.cantidad) <> 0 or count(*) <> 2) x),
  0, 'Traspaso espejo: Σ = 0 y dos movimientos por ítem');
select is((
  select count(*)::int from (
    select m.documento_id, m.producto_id from public.movimiento_inventario m join public.documento_inventario d on d.id = m.documento_id
    where d.tipo in ('salida', 'retorno') group by 1, 2 having sum(m.cantidad) <> 0) x),
  0, 'Salida y retorno: Σ = 0 por ítem');

-- 7 · Numeración sin huecos ni duplicados ------------------------------------------------------
select is((
  select count(*)::int from (
    select x.regional_id, x.t from (
      select regional_id, 'nota' as t, numero from public.nota_venta
      union all select regional_id, tipo, numero from public.documento_inventario
      union all select regional_id, 'cobranza', numero from public.cobranza
      union all select regional_id, 'devolucion', numero from public.devolucion
    ) x group by x.regional_id, x.t
    having max(substring(x.numero from '(\d+)$')::int) <> count(*) or count(distinct x.numero) <> count(*)) g),
  0, 'max(n) = count(*) por regional y tipo');

-- 8 · Anulación ----------------------------------------------------------------------------------
select is((
  select count(*)::int from public.nota_venta n where n.estado = 'anulada'
    and ((select sum(m.cantidad) from public.movimiento_inventario m where m.nota_venta_id = n.id) <> 0
         or exists (select 1 from public.movimiento_inventario m where m.nota_venta_id = n.id and m.tipo = 'anulacion' and m.fecha <> n.fecha))),
  0, 'Nota anulada: Σ movimientos = 0, con la fecha de la nota');

-- 9 · Saldos por cobrar ------------------------------------------------------------------------
select is((select count(*)::int from public.v_saldo_documento where saldo < 0), 0, 'Ningún saldo por cobrar negativo');

-- 10 · RLS y privilegios -------------------------------------------------------------------------
select is((select count(*)::int from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 0, 'RLS activa en todas las tablas de public');
select is((select count(*)::int from pg_policies where schemaname = 'public' and cmd <> 'SELECT' and tablename in (
             'nota_venta', 'nota_venta_item', 'documento_inventario', 'documento_inventario_item', 'movimiento_inventario', 'stock_saldo',
             'devolucion', 'devolucion_item', 'cobranza', 'cxc_saldo_inicial', 'liquidacion', 'liquidacion_linea', 'auditoria', 'correlativo')),
  0, 'Sin políticas de escritura en las tablas transaccionales (patrón C) ni en auditoría');
select is((select count(*)::int from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'), 0,
  'anon sin privilegios sobre tablas y vistas');
select is((select count(*)::int from pg_proc p join pg_namespace s on s.oid = p.pronamespace
           where s.nspname in ('public', 'app') and has_function_privilege('anon', p.oid, 'execute')), 0,
  'anon no ejecuta ninguna función de public ni de app');

-- 11 · Inmutabilidad -----------------------------------------------------------------------------
select is(tests.codigo_error($$update public.auditoria set accion = 'x'$$), 'INMUTABLE', 'La auditoría no se edita');
select is(tests.codigo_error($$delete from public.movimiento_inventario$$), 'INMUTABLE', 'Los movimientos no se borran');
select is(tests.codigo_error($$update public.nota_venta_item set cantidad = 1$$), 'INMUTABLE', 'Los ítems de una nota no se editan');

select * from finish();
rollback;
