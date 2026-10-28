-- Catálogo: líneas comerciales, productos y condiciones de pago (Esquema BD §1.6–1.8).

create table public.linea_comercial (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden integer not null default 0,  -- orden en el reporte diario
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.producto (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nombre text not null,
  linea_id uuid not null references public.linea_comercial (id),
  orden integer not null default 0,  -- orden dentro de la línea
  precio_base numeric(14,2) not null check (precio_base >= 0),
  stock_minimo numeric(14,2) not null default 0 check (stock_minimo >= 0),  -- ⚠ SUP-29
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index producto_nombre_key on public.producto (lower(nombre));
create index producto_nombre_trgm_idx on public.producto using gin (nombre extensions.gin_trgm_ops);

create table public.condicion_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo text not null check (tipo in ('contado', 'credito')),
  dias integer not null default 0,
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dias >= 0 and (tipo = 'credito' or dias = 0))
);
