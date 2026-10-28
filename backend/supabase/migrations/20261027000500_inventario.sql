-- Inventario: documentos, libro mayor de movimientos y saldos (Esquema BD §1.10–1.13).

create table public.documento_inventario (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  tipo text not null check (tipo in ('ingreso', 'salida', 'retorno', 'traspaso', 'ajuste')),
  regional_id uuid not null references public.regional (id),  -- lo pone app.tg_mov_set_regional
  almacen_id uuid not null references public.almacen (id),
  almacen_destino_id uuid references public.almacen (id),
  vendedor_id uuid references public.vendedor (id),
  fecha date not null,
  referencia text,  -- N° de remito, proveedor…
  motivo text,
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  unique (regional_id, numero),
  check ((tipo = 'traspaso') = (almacen_destino_id is not null)),
  check ((tipo in ('salida', 'retorno')) = (vendedor_id is not null)),
  check (tipo <> 'ajuste' or length(btrim(coalesce(motivo, ''))) > 0)
);
create index documento_inventario_regional_fecha_idx on public.documento_inventario (regional_id, fecha);
create index documento_inventario_destino_fecha_idx on public.documento_inventario (almacen_destino_id, fecha);

create table public.documento_inventario_item (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documento_inventario (id) on delete cascade,
  producto_id uuid not null references public.producto (id),
  cantidad numeric(14,2) not null check (cantidad <> 0),  -- > 0 salvo en ajuste (lo valida la RPC)
  unique (documento_id, producto_id)
);

-- Libro mayor: única fuente de verdad del stock. Inmutable.
create table public.movimiento_inventario (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null check (tipo in (
    'ingreso', 'salida', 'retorno', 'traspaso_salida', 'traspaso_entrada',
    'venta', 'anulacion', 'devolucion', 'ajuste'
  )),
  regional_id uuid not null references public.regional (id),  -- lo pone app.tg_mov_set_regional (⚙ DT-05)
  almacen_id uuid not null references public.almacen (id),
  vendedor_id uuid references public.vendedor (id),  -- nulo = stock físico del almacén
  producto_id uuid not null references public.producto (id),
  cantidad numeric(14,2) not null check (cantidad <> 0),
  documento_id uuid references public.documento_inventario (id),
  nota_venta_id uuid,  -- FK en la migración de ventas
  devolucion_id uuid,  -- FK en la migración de ventas
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  check (num_nonnulls(documento_id, nota_venta_id, devolucion_id) = 1)
);
create index movimiento_inventario_regional_producto_fecha_idx on public.movimiento_inventario (regional_id, producto_id, fecha);
create index movimiento_inventario_regional_fecha_tipo_idx on public.movimiento_inventario (regional_id, fecha, tipo);
create index movimiento_inventario_ubicacion_idx on public.movimiento_inventario (almacen_id, vendedor_id, producto_id, fecha, created_at);
create index movimiento_inventario_nota_venta_idx on public.movimiento_inventario (nota_venta_id);
create index movimiento_inventario_documento_idx on public.movimiento_inventario (documento_id);
create index movimiento_inventario_devolucion_idx on public.movimiento_inventario (devolucion_id);

-- Saldo por ubicación, mantenido solo por app.tg_mov_actualiza_saldo (⚙ DT-04).
create table public.stock_saldo (
  id uuid primary key default gen_random_uuid(),
  almacen_id uuid not null references public.almacen (id),
  vendedor_id uuid references public.vendedor (id),
  producto_id uuid not null references public.producto (id),
  regional_id uuid not null references public.regional (id),
  cantidad numeric(14,2) not null default 0 check (cantidad >= 0),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (almacen_id, vendedor_id, producto_id)
);
create index stock_saldo_regional_producto_idx on public.stock_saldo (regional_id, producto_id);
