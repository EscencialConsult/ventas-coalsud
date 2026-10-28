-- Datos de prueba de operación para probar todas las funcionalidades con datos (⚙ DT-43).
-- NO es una migración ni un seed: se corre a mano contra dev, una vez, sobre los datos base + seeds.
-- Todo pasa por las RPC reales, impersonando a los usuarios definidos (como lo hace PostgREST), así que
-- numeración, stock, auditoría, snapshots de cierre y validaciones son los de producción.
-- Una sola transacción: si algo falla, no queda nada a medias. Para volver a empezar: datos-prueba-limpiar.sql.
--
-- Qué arma (35 días hasta hoy, por regional; LP cierra hasta hace 3 días, CBBA hasta anteayer, SCZ hasta ayer):
--   · clientes extra (email @prueba.coalsud) · inventario inicial (ajuste) · cartera inicial (2025 y 2026)
--   · pedidos semanales (ingreso), salida a vendedor + ventas desde su saldo + retorno, traspasos, mermas
--   · 2 a 5 notas por día hábil: contado y crédito, descuentos, precios modificados, anuladas, factura al emitir
--     o después · cobranzas parciales y totales (una anulada) · cierres diarios en orden + una reapertura
--   · LP: días anteriores abiertos con una nota sin factura · hoy: notas sin factura, devoluciones (reembolso y
--     abono) con N° de NC contable · metas de presupuesto del mes anterior y del actual en distintos estados
--
-- Uso: psql "$SUPABASE_DB_URL" -X -f scripts/datos-prueba.sql   (npm run db:datos-prueba)
\set ON_ERROR_STOP 1
\pset pager off
set client_min_messages = warning;
begin;
select setseed(0.2026);

do $$
begin
  if exists (select 1 from public.nota_venta) or exists (select 1 from public.movimiento_inventario) then
    raise exception 'La base ya tiene operación cargada: corra antes scripts/datos-prueba-limpiar.sql';
  end if;
end $$;

-- Impersonación como PostgREST: claims del usuario y rol authenticated (vuelve a postgres para leer auth.users).
create function pg_temp.como(p_email text) returns void language plpgsql as $$
declare v_id uuid;
begin
  perform set_config('role', 'postgres', true);
  select id into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'No existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- 1 a 4 productos al azar con stock suficiente en el almacén; 1 de cada 12 con el precio rebajado 5 %.
-- La cantidad se sortea afuera: dentro de un "order by random() limit", Postgres reutiliza el mismo
-- random() del orden y las cantidades salen siempre bajas.
create function pg_temp.items(p_almacen uuid, p_max int) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('producto_id', x.producto_id, 'cantidad', 1 + floor(random() * p_max)::int,
    'precio_aplicado', case when random() < 0.08 then round(x.precio_base * 0.95, 2) else x.precio_base end))
  from (
    select s.producto_id, p.precio_base
    from public.stock_saldo s join public.producto p on p.id = s.producto_id
    where s.almacen_id = p_almacen and s.vendedor_id is null and p.activo and s.cantidad >= p_max + 3
    order by random() limit 1 + floor(random() * 4)::int
  ) x
$$;

-- Nota de venta con el vendedor, canal y condición del cliente.
create function pg_temp.nota(p_regional uuid, p_fecha date, p_cliente uuid, p_items jsonb, p_descuento numeric,
                             p_origen text, p_factura text) returns uuid language plpgsql as $$
begin
  return (public.emitir_nota_venta(p_regional, p_fecha, p_cliente,
    (select c.vendedor_id from public.cliente c where c.id = p_cliente),
    null, null, p_descuento, p_origen, p_factura, null, p_items) ->> 'id')::uuid;
end $$;

do $$
declare
  v_hoy date := app.hoy();
  v_d0 date := app.hoy() - 35;
  v_reg uuid[];
  v_cod text[];
  v_alm uuid[];
  v_mail text[];
  v_hasta date[];          -- último día que cierra cada regional
  v_fac int[] := array[2000, 3000, 4000];
  v_vend uuid[];           -- vendedor con mercadería en poder (LP y SCZ)
  v_vend_prod uuid[];
  d date;
  i int;
  k int;
  v_n int;
  v_pendiente boolean;
  v_prod uuid;
  v_items jsonb;
  v_nota uuid;
  v_cli uuid;
  v_factura text;
  v_desc numeric;
  v_doc record;
  v_forma text;
  v_importe numeric;
  v_cobro jsonb;
  v_dev jsonb;
  v_real numeric;
  v_proy numeric;
  v_mes text := to_char(app.hoy(), 'YYYY-MM');
  v_mes_ant text := to_char(app.hoy() - interval '1 month', 'YYYY-MM');
  v_dias_mes int := extract(day from date_trunc('month', app.hoy()) + interval '1 month - 1 day')::int;
begin
  select array_agg(r.id order by o), array_agg(r.codigo order by o), array_agg(a.id order by o),
    array_agg(case r.codigo when 'SCZ' then 'fernando@coalsud.demo' else 'vanessa@coalsud.demo' end order by o)
  into v_reg, v_cod, v_alm, v_mail
  from public.regional r
  join public.almacen a on a.regional_id = r.id
  cross join lateral (select array_position(array['LP', 'CBBA', 'SCZ'], r.codigo) as o) x
  where r.codigo in ('LP', 'CBBA', 'SCZ');
  v_hasta := array[v_hoy - 3, v_hoy - 2, v_hoy - 1];
  v_vend := array[(select id from public.vendedor where nombre = 'Arturo Reynaga'), null, (select id from public.vendedor where nombre = 'Marcela')];

  -- Clientes extra (los cargan los regionales) ------------------------------------------------
  perform pg_temp.como('vanessa@coalsud.demo');
  insert into public.cliente (regional_id, nombre, razon_social, nit, categoria, canal, condicion_pago_id, vendedor_id, zona, telefono, email)
  select v_reg[x.r], x.nombre, x.razon, x.nit, x.categoria, x.canal, (select id from public.condicion_pago where nombre = x.condicion),
    (select id from public.vendedor where nombre = x.vendedor), x.zona, x.telefono, x.correo
  from (values
    (1, 'Ketal Calacoto', 'Ketal S.A.', '1020304025', 'supermercado', 'supermercado', 'Crédito 30 días', 'Flavia Rivera', 'Calacoto', '2-2771234', 'ketal@prueba.coalsud'),
    (1, 'Supermercado Zatt', 'Zatt SRL', '3344556017', 'supermercado', 'supermercado', 'Crédito 15 días', 'Martha Canedo', 'Miraflores', '2-2229876', 'zatt@prueba.coalsud'),
    (1, 'Distribuidora El Alto', 'Distribuidora El Alto SRL', '4455667011', 'mayorista', 'ruta', 'Crédito 30 días', 'Arturo Reynaga', 'El Alto', '7-1234567', 'dist-elalto@prueba.coalsud'),
    (1, 'Tienda Don Pedro', null, null, 'minorista', 'ruta', 'Contado', 'Arturo Reynaga', 'Villa Fátima', '7-7654321', 'donpedro@prueba.coalsud'),
    (1, 'Colegio San Ignacio', 'Unidad Educativa San Ignacio', '1000200034', 'institucional', 'institucional', 'Crédito 60 días', 'Martha Canedo', 'Obrajes', '2-2781111', 'sanignacio@prueba.coalsud'),
    (1, 'Minimarket Sopocachi', null, null, 'minorista', 'ruta', 'Contado', 'Martha Canedo', 'Sopocachi', '7-2223334', 'minisopocachi@prueba.coalsud'),
    (2, 'IC Norte', 'IC Norte S.A.', '2030405016', 'supermercado', 'supermercado', 'Crédito 30 días', 'Jorge León', 'Cala Cala', '4-4251234', 'icnorte@prueba.coalsud'),
    (2, 'Mayorista La Cancha', null, null, 'mayorista', 'ruta', 'Contado', 'Jorge León', 'La Cancha', '7-4445556', 'lacancha@prueba.coalsud'),
    (2, 'Tienda Doña Julia', null, null, 'minorista', 'ruta', 'Contado', 'Jorge León', 'Sarco', '7-4449990', 'donajulia@prueba.coalsud'),
    (2, 'Hospital Viedma', 'Hospital Clínico Viedma', '1003004025', 'institucional', 'institucional', 'Crédito 90 días', 'Jorge León', 'Centro', '4-4533240', 'viedma@prueba.coalsud')
  ) x (r, nombre, razon, nit, categoria, canal, condicion, vendedor, zona, telefono, correo);

  perform pg_temp.como('fernando@coalsud.demo');
  insert into public.cliente (regional_id, nombre, razon_social, nit, categoria, canal, condicion_pago_id, vendedor_id, zona, telefono, email)
  select v_reg[3], x.nombre, x.razon, x.nit, x.categoria, x.canal, (select id from public.condicion_pago where nombre = x.condicion),
    (select id from public.vendedor where nombre = x.vendedor), x.zona, x.telefono, x.correo
  from (values
    ('Hipermaxi Equipetrol', 'Hipermaxi S.A.', '1028627025', 'supermercado', 'supermercado', 'Crédito 30 días', 'Mario Condori', 'Equipetrol', '3-3421234', 'hiperequipetrol@prueba.coalsud'),
    ('Mayorista Los Pozos', null, null, 'mayorista', 'ruta', 'Contado', 'Marcela', 'Los Pozos', '7-3334445', 'lospozos@prueba.coalsud'),
    ('Tienda La Ramada', null, null, 'minorista', 'ruta', 'Contado', 'Marcela', 'La Ramada', '7-3336667', 'laramada@prueba.coalsud'),
    ('Universidad UPSA', 'Universidad Privada de Santa Cruz', '1015583020', 'institucional', 'institucional', 'Crédito 60 días', 'Sheila', 'Norte', '3-3464000', 'upsa@prueba.coalsud')
  ) x (nombre, razon, nit, categoria, canal, condicion, vendedor, zona, telefono, correo);

  -- Cartera inicial (nacional): saldos anteriores al sistema de los clientes a crédito -------------
  perform pg_temp.como('irene@coalsud.demo');
  for i in 1..3 loop
    select jsonb_agg(jsonb_build_object('cliente_id', x.cliente_id, 'numero_documento', format('F-%s', v_fac[i] - 900 + x.n),
      'fecha_documento', x.fecha, 'fecha_vencimiento', x.fecha + x.dias, 'importe', x.importe,
      'observaciones', 'Saldo según EECC anterior al sistema'))
    into v_items
    from (
      -- dos documentos por cliente a crédito, entre fines de 2025 y antes del arranque
      select c.id as cliente_id, cp.dias, row_number() over () as n,
        v_d0 - 20 - floor(random() * 300)::int as fecha,
        round((300 + random() * 4700)::numeric, 2) as importe
      from public.cliente c
      join public.condicion_pago cp on cp.id = c.condicion_pago_id
      cross join generate_series(1, 2) g
      where c.regional_id = v_reg[i] and cp.tipo = 'credito'
    ) x;
    perform public.cargar_cartera_inicial(v_reg[i], v_items);
  end loop;

  -- Operación día por día ------------------------------------------------------------------
  for d in select g::date from generate_series(v_d0, v_hoy, interval '1 day') g loop
    for i in 1..3 loop
      perform pg_temp.como(v_mail[i]);

      -- inventario inicial (ajuste); algunos productos quedan bajo mínimo
      if d = v_d0 then
        select jsonb_agg(jsonb_build_object('producto_id', p.id, 'cantidad',
          case when random() < 0.06 then 3 + floor(random() * 8)::int
               else (array[60, 30, 45])[i] + floor(random() * (array[180, 90, 135])[i])::int end))
        into v_items from public.producto p where p.activo;
        perform public.registrar_ajuste(v_alm[i], d, 'Inventario inicial: conteo de puesta en marcha (datos de prueba)', v_items);
        continue;
      end if;

      -- pedido semanal del proveedor
      if (d - v_d0) % 7 = 0 then
        select jsonb_agg(jsonb_build_object('producto_id', x.id, 'cantidad', 24 + floor(random() * 73)::int)) into v_items
        from (select p.id from public.producto p where p.activo order by random() limit 6) x;
        perform public.registrar_ingreso(v_alm[i], d, format('Pedido proveedor %s', to_char(d, 'DD/MM')), v_items);
      end if;

      -- mercadería en poder del vendedor (LP: Arturo, SCZ: Marcela): salida, ventas desde su saldo y retorno
      if v_vend[i] is not null then
        if d = v_d0 + 3 then
          select array_agg(x.producto_id), jsonb_agg(jsonb_build_object('producto_id', x.producto_id, 'cantidad', 30)) into v_vend_prod, v_items
          from (select s.producto_id from public.stock_saldo s join public.producto p on p.id = s.producto_id
                where s.almacen_id = v_alm[i] and s.vendedor_id is null and p.activo and s.cantidad >= 90 order by random() limit 4) x;
          perform public.registrar_salida(v_alm[i], v_vend[i], d, 'Carga para venta en ruta', v_items);
        elsif d between v_d0 + 4 and v_d0 + 9 and extract(dow from d) <> 0 then
          select jsonb_agg(jsonb_build_object('producto_id', x.producto_id, 'cantidad', 1 + floor(random() * 2)::int, 'precio_aplicado', x.precio_base))
          into v_items
          from (select s.producto_id, p.precio_base from public.stock_saldo s join public.producto p on p.id = s.producto_id
                where s.vendedor_id = v_vend[i] and s.cantidad >= 3 order by random() limit 2) x;
          select c.id into v_cli from public.cliente c where c.vendedor_id = v_vend[i] and c.activo order by random() limit 1;
          v_fac[i] := v_fac[i] + 1;
          perform pg_temp.nota(v_reg[i], d, v_cli, v_items, 0, 'vendedor', format('F-%s', v_fac[i]));
        elsif d = v_d0 + 12 then
          select jsonb_agg(jsonb_build_object('producto_id', s.producto_id, 'cantidad', floor(s.cantidad / 2)::int)) into v_items
          from public.stock_saldo s where s.vendedor_id = v_vend[i] and s.cantidad >= 2;
          if v_items is not null then
            perform public.registrar_retorno(v_alm[i], v_vend[i], d, 'Sobrante de la ruta', v_items);
          end if;
        end if;
      end if;

      -- traspasos entre regionales (los registra la regional de origen)
      if (d = v_d0 + 8 and v_cod[i] = 'LP') or (d = v_d0 + 18 and v_cod[i] = 'SCZ') then
        select jsonb_agg(jsonb_build_object('producto_id', x.producto_id, 'cantidad', 8 + floor(random() * 5)::int)) into v_items
        from (select s.producto_id from public.stock_saldo s join public.producto p on p.id = s.producto_id
              where s.almacen_id = v_alm[i] and s.vendedor_id is null and p.activo and s.cantidad >= 40 order by random() limit 3) x;
        perform public.registrar_traspaso(v_alm[i], case v_cod[i] when 'LP' then v_alm[2] else v_alm[1] end, d,
          format('Reposición a %s', case v_cod[i] when 'LP' then 'Cochabamba' else 'La Paz' end), v_items);
      end if;

      -- merma
      if (d - v_d0) % 11 = 5 then
        select jsonb_agg(jsonb_build_object('producto_id', x.producto_id, 'cantidad', -2)) into v_items
        from (select s.producto_id from public.stock_saldo s where s.almacen_id = v_alm[i] and s.vendedor_id is null and s.cantidad >= 20
              order by random() limit 1) x;
        perform public.registrar_ajuste(v_alm[i], d, 'Merma: envase dañado en el almacén', v_items);
      end if;

      -- notas de venta (preventa: descuentan el almacén)
      v_n := case when extract(dow from d) = 0 then floor(random() * 2)::int else 2 + floor(random() * 4)::int end;
      for k in 1..v_n loop
        select c.id into v_cli from public.cliente c where c.regional_id = v_reg[i] and c.activo order by random() limit 1;
        v_items := pg_temp.items(v_alm[i], 12);
        continue when v_items is null;
        v_desc := case when random() < 0.08 then 5 when random() < 0.08 then 3 else 0 end;
        v_pendiente := v_cod[i] = 'LP' and d = v_hoy - 2 and k = 1;  -- LP: un día anterior abierto por falta de factura
        v_factura := null;
        if random() < 0.7 and d < v_hoy and not v_pendiente then
          v_fac[i] := v_fac[i] + 1;
          v_factura := format('F-%s', v_fac[i]);
        end if;
        v_nota := pg_temp.nota(v_reg[i], d, v_cli, v_items, v_desc, 'almacen', v_factura);
        if v_factura is null then
          if v_pendiente or (d = v_hoy and random() < 0.6) then
            null;  -- queda pendiente de factura
          elsif random() < 0.07 then
            perform public.anular_nota_venta(v_nota, 'Cliente ausente: no recibió el pedido');
          else
            v_fac[i] := v_fac[i] + 1;
            perform public.registrar_factura_nota(v_nota, format('F-%s', v_fac[i]), null);
          end if;
        end if;
      end loop;

      -- cobranzas de notas a crédito y de la cartera inicial (parciales y totales)
      for v_doc in
        select s.tipo_doc, s.documento_id, s.saldo from public.v_saldo_documento s
        where s.regional_id = v_reg[i] and s.saldo > 0 and s.fecha < d
        order by random() limit case when v_cod[i] = 'LP' and d = v_d0 + 15 then 2 else floor(random() * 3)::int end
      loop
        v_forma := (array['efectivo', 'transferencia', 'transferencia', 'qr', 'deposito', 'cheque'])[1 + floor(random() * 6)::int];
        v_importe := case when random() < 0.5 then v_doc.saldo else greatest(round(v_doc.saldo * 0.4, 2), 0.01) end;
        v_cobro := public.registrar_cobranzas(v_reg[i], d, v_forma,
          case v_forma when 'efectivo' then null else format('%s-%s', upper(left(v_forma, 3)), 10000 + floor(random() * 89999)::int) end,
          null, jsonb_build_array(jsonb_build_object('tipo_doc', v_doc.tipo_doc, 'documento_id', v_doc.documento_id, 'importe', v_importe)));
      end loop;

      -- una cobranza mal cargada que se anula el mismo día
      if v_cod[i] = 'LP' and d = v_d0 + 15 and v_cobro is not null then
        perform public.anular_cobranza((v_cobro -> 0 ->> 'id')::uuid, 'Importe mal cargado: se registró dos veces');
      end if;
      v_cobro := null;
    end loop;

    -- cierre del día, en orden (LP hasta anteayer, CBBA hasta ayer-1, SCZ hasta ayer)
    for i in 1..3 loop
      if d <= v_hasta[i] then
        perform pg_temp.como(v_mail[i]);
        perform public.cerrar_liquidacion(v_reg[i], d);
      end if;
    end loop;
  end loop;

  -- Reapertura (nacional) del último día cerrado de SCZ y nuevo cierre --------------------------
  perform pg_temp.como('irene@coalsud.demo');
  perform public.reabrir_liquidacion(v_reg[3], v_hoy - 1, 'Revisión del arqueo con el regional');
  perform pg_temp.como('fernando@coalsud.demo');
  perform public.cerrar_liquidacion(v_reg[3], v_hoy - 1);

  -- Devoluciones de hoy sobre notas de días cerrados -------------------------------------------
  perform pg_temp.como('vanessa@coalsud.demo');
  select nv.id, i2.producto_id into v_nota, v_prod
  from public.nota_venta nv join public.nota_venta_item i2 on i2.nota_venta_id = nv.id
  where nv.regional_id = v_reg[1] and nv.estado = 'emitida' and nv.condicion_tipo = 'contado' and nv.fecha <= v_hasta[1] and i2.cantidad >= 2
  order by nv.fecha desc, nv.numero desc limit 1;
  v_dev := public.registrar_devolucion(v_nota, 'reembolso', 'Producto vencido',
    jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 1)));
  perform public.registrar_nc_contable((v_dev ->> 'id')::uuid, 'NC-000187');

  for i in 1..3 loop
    continue when i = 2;
    perform pg_temp.como(v_mail[i]);
    select nv.id, i2.producto_id into v_nota, v_prod
    from public.v_nota_venta nv join public.nota_venta_item i2 on i2.nota_venta_id = nv.id
    where nv.regional_id = v_reg[i] and nv.estado = 'emitida' and nv.condicion_tipo = 'credito' and nv.fecha <= v_hasta[i]
      and i2.cantidad >= 2 and nv.saldo >= i2.precio_aplicado
    order by nv.fecha desc, nv.numero desc limit 1;
    if v_nota is not null then
      perform public.registrar_devolucion(v_nota, 'abono_cuenta', 'Empaque dañado en la entrega',
        jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 1)));
    end if;
  end loop;

  -- Presupuesto: metas del mes anterior y del actual, en distintos estados -----------------------
  for i in 1..3 loop
    perform set_config('role', 'postgres', true);
    -- real del mes en curso y proyección de cierre, como cumplimiento_presupuesto (Reglas §8)
    select coalesce(sum(t.total), 0) into v_real from (
      select round(coalesce(sum(it.subtotal), 0) * (1 - nv.descuento_pct / 100), 2) as total
      from public.nota_venta nv join public.nota_venta_item it on it.nota_venta_id = nv.id
      where nv.regional_id = v_reg[i] and nv.estado = 'emitida' and to_char(nv.fecha, 'YYYY-MM') = v_mes group by nv.id, nv.descuento_pct) t;
    v_proy := v_real / extract(day from v_hoy) * v_dias_mes;
    perform pg_temp.como(v_mail[i]);
    insert into public.presupuesto (periodo, regional_id, meta, observaciones) values
      (v_mes, v_reg[i], greatest(round(v_proy * (array[0.97, 0.80, 1.06])[i], -2), 1000),
       (array['Meta mensual de la regional', 'Meta mensual (ya alcanzada)', 'Meta mensual exigente'])[i]),
      (v_mes_ant, v_reg[i], greatest(round(v_proy * (array[0.20, 0.60, 0.15])[i], -2), 1000), 'Meta del mes anterior');
  end loop;
  perform pg_temp.como('vanessa@coalsud.demo');
  insert into public.presupuesto (periodo, regional_id, vendedor_id, categoria_cliente, meta, observaciones) values
    (v_mes, v_reg[1], (select id from public.vendedor where nombre = 'Flavia Rivera'), null, 9000, 'Meta de la vendedora'),
    (v_mes, v_reg[1], null, 'supermercado', 12000, 'Meta del canal supermercados');
  perform pg_temp.como('fernando@coalsud.demo');
  insert into public.presupuesto (periodo, regional_id, vendedor_id, meta, observaciones) values
    (v_mes, v_reg[3], (select id from public.vendedor where nombre = 'Mario Condori'), 25000, 'Meta del vendedor');

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Resumen -----------------------------------------------------------------------------------
select set_config('role', 'postgres', true) \gset ignorar_
select r.codigo as regional,
  (select count(*) from public.nota_venta n where n.regional_id = r.id) as notas,
  (select count(*) from public.nota_venta n where n.regional_id = r.id and n.estado = 'anulada') as anuladas,
  (select count(*) from public.nota_venta n where n.regional_id = r.id and n.estado = 'emitida' and n.numero_factura is null) as sin_factura,
  (select count(*) from public.cobranza c where c.regional_id = r.id) as cobranzas,
  (select count(*) from public.devolucion d where d.regional_id = r.id) as devoluciones,
  (select count(*) from public.documento_inventario d where d.regional_id = r.id) as docs_inventario,
  (select count(*) from public.liquidacion l where l.regional_id = r.id and l.estado = 'cerrada') as dias_cerrados,
  (select count(*) from public.liquidacion l where l.regional_id = r.id and l.estado = 'abierta') as dias_abiertos,
  (select count(*) from public.cxc_saldo_inicial s where s.regional_id = r.id) as cartera,
  (select count(*) from public.presupuesto p where p.regional_id = r.id) as metas
from public.regional r order by array_position(array['LP', 'CBBA', 'SCZ'], r.codigo);
select (select count(*) from app.verificar_stock()) as diferencias_stock, (select count(*) from public.auditoria) as auditoria;

commit;
