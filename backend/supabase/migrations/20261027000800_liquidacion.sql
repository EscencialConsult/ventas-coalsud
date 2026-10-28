-- Liquidación / reporte diario y sus tipos compuestos (Esquema BD §1.20–1.21, §5).

create table public.liquidacion (
  id uuid primary key default gen_random_uuid(),
  regional_id uuid not null references public.regional (id),
  fecha date not null,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  cerrada_por uuid references public.usuario (id),
  cerrada_en timestamptz,
  reabierta_por uuid references public.usuario (id),
  reabierta_en timestamptz,
  motivo_reapertura text,
  -- totales congelados al cerrar (Reglas de Cálculo §3.2–3.3)
  total_contado_bruto numeric(14,2),
  total_credito_bruto numeric(14,2),
  descuento_contado numeric(14,2),
  descuento_credito numeric(14,2),
  total_cobranzas numeric(14,2),
  total_reembolsos numeric(14,2),
  total_ventas numeric(14,2),
  total_efectivo numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (regional_id, fecha),
  check (estado = 'abierta' or (total_ventas is not null and total_efectivo is not null))
);
create index liquidacion_abierta_idx on public.liquidacion (regional_id, fecha) where estado = 'abierta';

-- Snapshot de la matriz del día al cerrar.
create table public.liquidacion_linea (
  id uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null references public.liquidacion (id) on delete cascade,
  producto_id uuid not null references public.producto (id),
  linea_id uuid not null references public.linea_comercial (id),
  orden_linea integer not null,
  orden_producto integer not null,
  producto_nombre text not null,
  linea_nombre text not null,
  precio_unit numeric(14,2) not null,
  saldo_inicial numeric(14,2) not null default 0,
  pedido numeric(14,2) not null default 0,
  traspaso numeric(14,2) not null default 0,
  devolucion numeric(14,2) not null default 0,
  ajuste numeric(14,2) not null default 0,
  venta_contado_q numeric(14,2) not null default 0,
  venta_contado_bs numeric(14,2) not null default 0,
  venta_credito_q numeric(14,2) not null default 0,
  venta_credito_bs numeric(14,2) not null default 0,
  total_ventas_q numeric(14,2) not null default 0,
  total_ventas_bs numeric(14,2) not null default 0,
  saldo_final numeric(14,2) not null,
  unique (liquidacion_id, producto_id)
);

create type app.t_linea_liquidacion as (
  producto_id uuid, linea_id uuid, orden_linea int, orden_producto int,
  producto_nombre text, linea_nombre text, precio_unit numeric(14,2),
  saldo_inicial numeric(14,2), pedido numeric(14,2), traspaso numeric(14,2),
  devolucion numeric(14,2), ajuste numeric(14,2),
  venta_contado_q numeric(14,2), venta_contado_bs numeric(14,2),
  venta_credito_q numeric(14,2), venta_credito_bs numeric(14,2),
  total_ventas_q numeric(14,2), total_ventas_bs numeric(14,2),
  saldo_final numeric(14,2), con_movimiento boolean
);

create type app.t_totales_liquidacion as (
  total_contado_bruto numeric(14,2), total_credito_bruto numeric(14,2),
  descuento_contado numeric(14,2), descuento_credito numeric(14,2),
  total_cobranzas numeric(14,2), total_reembolsos numeric(14,2),
  total_ventas numeric(14,2), total_efectivo numeric(14,2)
);
