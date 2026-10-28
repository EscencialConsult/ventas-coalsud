-- Ventas: notas de venta y devoluciones (Esquema BD §1.14–1.17).

create table public.nota_venta (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  regional_id uuid not null references public.regional (id),
  fecha date not null,
  cliente_id uuid not null references public.cliente (id),
  vendedor_id uuid not null references public.vendedor (id),
  canal text not null check (canal in ('supermercado', 'ruta', 'institucional')),
  condicion_pago_id uuid not null references public.condicion_pago (id),
  -- foto de la condición al emitir
  condicion_tipo text not null check (condicion_tipo in ('contado', 'credito')),
  dias_credito integer not null default 0 check (dias_credito >= 0),
  fecha_vencimiento date generated always as (fecha + dias_credito) stored,
  descuento_pct numeric(5,2) not null default 0 check (descuento_pct between 0 and 100),
  origen_stock text not null default 'almacen' check (origen_stock in ('almacen', 'vendedor')),  -- ⚠ SUP-14
  -- factura: se puede registrar con el día cerrado (⚠ SUP-06)
  numero_factura text check (numero_factura is null or length(btrim(numero_factura)) between 1 and 30),
  factura_pdf_path text,  -- ruta en el bucket facturas
  factura_registrada_en timestamptz,
  estado text not null default 'emitida' check (estado in ('emitida', 'anulada')),
  motivo_anulacion text,
  anulada_por uuid references public.usuario (id),
  anulada_en timestamptz,
  observaciones text,
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (regional_id, numero),
  check ((estado = 'anulada') = (anulada_en is not null))
);
create index nota_venta_regional_fecha_idx on public.nota_venta (regional_id, fecha);
create index nota_venta_cliente_fecha_idx on public.nota_venta (cliente_id, fecha);
create index nota_venta_vendedor_fecha_idx on public.nota_venta (vendedor_id, fecha);
create index nota_venta_regional_factura_idx on public.nota_venta (regional_id, numero_factura);
create index nota_venta_pendiente_factura_idx on public.nota_venta (regional_id, fecha)
  where numero_factura is null and estado = 'emitida';

create table public.nota_venta_item (
  id uuid primary key default gen_random_uuid(),
  nota_venta_id uuid not null references public.nota_venta (id) on delete cascade,
  producto_id uuid not null references public.producto (id),
  cantidad numeric(14,2) not null check (cantidad > 0),
  precio_base numeric(14,2) not null check (precio_base >= 0),  -- foto del catálogo
  precio_aplicado numeric(14,2) not null check (precio_aplicado >= 0),
  subtotal numeric(14,2) generated always as (round(cantidad * precio_aplicado, 2)) stored,
  unique (nota_venta_id, producto_id)  -- ⚠ SUP-47
);

create table public.devolucion (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  regional_id uuid not null references public.regional (id),  -- = la de la nota
  fecha date not null,  -- = app.hoy() al registrar
  nota_venta_id uuid not null references public.nota_venta (id),
  tipo_reverso text not null check (tipo_reverso in ('reembolso', 'abono_cuenta')),
  motivo text not null check (length(btrim(motivo)) > 0),
  nc_contable_numero text,  -- N° de nota de crédito de Contabilidad (se carga después)
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  unique (regional_id, numero)
);
create index devolucion_regional_fecha_idx on public.devolucion (regional_id, fecha);
create index devolucion_nota_venta_idx on public.devolucion (nota_venta_id);

create table public.devolucion_item (
  id uuid primary key default gen_random_uuid(),
  devolucion_id uuid not null references public.devolucion (id) on delete cascade,
  producto_id uuid not null references public.producto (id),
  cantidad numeric(14,2) not null check (cantidad > 0),
  precio_aplicado numeric(14,2) not null,  -- foto del ítem de la nota
  unique (devolucion_id, producto_id)
);

-- FK de movimiento_inventario que esperaban a estas tablas.
alter table public.movimiento_inventario
  add foreign key (nota_venta_id) references public.nota_venta (id),
  add foreign key (devolucion_id) references public.devolucion (id);
