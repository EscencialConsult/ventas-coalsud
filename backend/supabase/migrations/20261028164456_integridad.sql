-- Verificación de integridad del stock (Esquema BD §3, Estrategia de Pruebas §4.1). BE-22.

-- Ubicaciones donde el saldo de stock_saldo no coincide con Σ movimientos. Debe devolver 0 filas.
-- Solo para pruebas y soporte (postgres / service_role): no se habilita a authenticated.
create function app.verificar_stock()
returns table (almacen_id uuid, vendedor_id uuid, producto_id uuid, saldo_tabla numeric, saldo_movimientos numeric)
language sql stable security definer set search_path = '' as $$
  with mov as (
    select m.almacen_id, m.vendedor_id, m.producto_id, sum(m.cantidad) as saldo
    from public.movimiento_inventario m
    group by m.almacen_id, m.vendedor_id, m.producto_id
  ),
  -- el vendedor nulo (almacén) se compara como un uuid fijo: un full join necesita igualdad
  tabla as (select s.*, coalesce(s.vendedor_id, '00000000-0000-0000-0000-000000000000'::uuid) as v from public.stock_saldo s),
  movs as (select m.*, coalesce(m.vendedor_id, '00000000-0000-0000-0000-000000000000'::uuid) as v from mov m)
  select coalesce(t.almacen_id, m.almacen_id), coalesce(t.vendedor_id, m.vendedor_id), coalesce(t.producto_id, m.producto_id),
    coalesce(t.cantidad, 0), coalesce(m.saldo, 0)
  from tabla t
  full join movs m on m.almacen_id = t.almacen_id and m.v = t.v and m.producto_id = t.producto_id
  where coalesce(t.cantidad, 0) <> coalesce(m.saldo, 0);
$$;

revoke execute on all functions in schema app from public;
