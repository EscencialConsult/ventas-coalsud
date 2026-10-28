-- Clientes (Esquema BD §1.9).

create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  regional_id uuid not null references public.regional (id),
  nombre text not null,
  razon_social text,
  nit text,
  categoria text not null check (categoria in ('supermercado', 'mayorista', 'minorista', 'institucional')),
  canal text not null check (canal in ('supermercado', 'ruta', 'institucional')),
  vendedor_id uuid references public.vendedor (id),  -- misma regional: app.tg_cliente_vendedor
  condicion_pago_id uuid not null references public.condicion_pago (id),
  zona text,
  telefono text,
  email text,
  direccion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- destino de FK compuestas: garantiza "cliente de la misma regional"
  unique (id, regional_id)
);
create index cliente_regional_nombre_idx on public.cliente (regional_id, lower(nombre));
create index cliente_nombre_trgm_idx on public.cliente using gin (nombre extensions.gin_trgm_ops);
create index cliente_regional_nit_idx on public.cliente (regional_id, nit);
