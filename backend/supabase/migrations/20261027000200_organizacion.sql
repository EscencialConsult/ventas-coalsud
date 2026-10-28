-- Organización: regionales, usuarios, vendedores y almacenes (Esquema BD §1.1–1.5).

create table public.regional (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z]{2,5}$'),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfil de negocio de cada cuenta de auth.users.
create table public.usuario (
  id uuid primary key references auth.users (id) on delete restrict,
  nombre text not null,
  email text not null unique check (email = lower(email)),
  rol text not null check (rol in ('nacional', 'regional')),
  activo boolean not null default true,
  debe_cambiar_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Regionales que opera cada usuario regional (el nacional no tiene filas: ve todas).
create table public.usuario_regional (
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  regional_id uuid not null references public.regional (id),
  primary key (usuario_id, regional_id)
);

create table public.vendedor (
  id uuid primary key default gen_random_uuid(),
  regional_id uuid not null references public.regional (id),
  nombre text not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- destino de FK compuestas: garantiza "vendedor de la misma regional"
  unique (id, regional_id)
);
create unique index vendedor_regional_nombre_key on public.vendedor (regional_id, lower(nombre));

create table public.almacen (
  id uuid primary key default gen_random_uuid(),
  regional_id uuid not null references public.regional (id),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (regional_id, nombre)
);
