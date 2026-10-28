-- Hoja de carga (Reglas §7.3, ⚠ SUP-53). Caso: CP-06.19.
begin;
select plan(6);

select tests.vaciar();
select tests.crear_regionales();
select tests.crear_usuario('vanessa@coalsud.demo', 'regional', '{LP}');
select tests.crear_usuario('fernando@coalsud.demo', 'regional', '{SCZ}');
insert into public.condicion_pago (nombre, tipo, dias) values ('Contado', 'contado', 0);
insert into public.linea_comercial (nombre, orden) values ('COMRURAL', 1);
insert into public.producto (nombre, linea_id, orden, precio_base)
select p.nombre, l.id, p.orden, p.precio from public.linea_comercial l, (values ('QUINUA BLANCA 1KG', 2, 44), ('QUINUA BLANCA 400GR', 1, 22)) p (nombre, orden, precio);
insert into public.vendedor (regional_id, nombre) values (tests.regional('LP'), 'Flavia Rivera'), (tests.regional('LP'), 'Martha Canedo');
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id, zona)
values (tests.regional('LP'), 'Mi Super', 'supermercado', 'supermercado', tests.condicion('Contado'), 'Sopocachi');

-- Flavia: 3 emitidas (una con 10 % de descuento) y 1 anulada. Martha: 1.
select tests.como('vanessa@coalsud.demo');
select public.registrar_ingreso(tests.almacen('LP'), public.hoy(), null,
  jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 100, 0), tests.item_nota('QUINUA BLANCA 400GR', 100, 0)));
select tests.emitir('LP', 'Mi Super', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 2, 44), tests.item_nota('QUINUA BLANCA 400GR', 1, 22)));
select tests.emitir('LP', 'Mi Super', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 3, 44)), 10);
select tests.emitir('LP', 'Mi Super', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 400GR', 4, 22)));
select public.anular_nota_venta((tests.emitir('LP', 'Mi Super', 'Flavia Rivera', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44))) ->> 'id')::uuid, 'error');
select tests.emitir('LP', 'Mi Super', 'Martha Canedo', jsonb_build_array(tests.item_nota('QUINUA BLANCA 1KG', 1, 44)));

create temporary table hoja on commit drop as
select public.hoja_carga(tests.regional('LP'), public.hoy(), tests.vendedor('Flavia Rivera')) -> 0 as h;

select is((select h ->> 'vendedor' from hoja), 'Flavia Rivera',
  'Una hoja para el vendedor pedido (CP-06.19)');
select is(
  (select array_agg(p ->> 'producto' || ' ' || (p ->> 'cantidad') || ' ' || (p ->> 'bs')) from hoja, jsonb_array_elements(h -> 'productos') p),
  array['QUINUA BLANCA 400GR 5.00 110.00', 'QUINUA BLANCA 1KG 5.00 220.00'],
  'Consolida por producto, en el orden de la línea; la anulada no cuenta');
select is((select jsonb_array_length(h -> 'notas') from hoja), 3,
  'Lista las 3 notas emitidas');
select is(
  (select (h -> 'totales' ->> 'unidades') || '/' || (h -> 'totales' ->> 'bruto') || '/' || (h -> 'totales' ->> 'descuento') || '/' || (h -> 'totales' ->> 'neto') from hoja),
  '10.00/330.00/13.20/316.80',
  'Totales: 10 u., bruto 330, descuento 13.20, neto 110 + 118.80 + 88');
select is(
  (select array_agg(x ->> 'vendedor') from jsonb_array_elements(public.hoja_carga(tests.regional('LP'), public.hoy())) x),
  array['Flavia Rivera', 'Martha Canedo'],
  'Sin vendedor: una hoja por vendedor, por nombre');

select tests.como('fernando@coalsud.demo');
select is(public.hoja_carga(tests.regional('LP'), public.hoy()), '[]'::jsonb,
  'Fernando no ve la hoja de La Paz (RLS)');

select * from finish();
rollback;
