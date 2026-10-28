-- Presupuesto, auditoría y correlativos (Esquema BD §1.22–1.24).

create table public.presupuesto (
  id uuid primary key default gen_random_uuid(),
  periodo text not null check (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- AAAA-MM
  regional_id uuid not null references public.regional (id),
  vendedor_id uuid,
  categoria_cliente text check (categoria_cliente in ('supermercado', 'mayorista', 'minorista', 'institucional')),
  meta numeric(14,2) not null check (meta > 0),
  observaciones text,
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (periodo, regional_id, vendedor_id, categoria_cliente),
  foreign key (vendedor_id, regional_id) references public.vendedor (id, regional_id)
);

-- Registro inmutable de acciones (Seguridad RLS §8).
create table public.auditoria (
  id bigint generated always as identity primary key,
  usuario_id uuid,  -- nulo = proceso del sistema
  regional_id uuid,
  accion text not null,
  entidad text not null,  -- nombre de tabla
  entidad_id text not null,
  datos jsonb not null default '{}',  -- {antes, despues, contexto}
  created_at timestamptz not null default now()
);
create index auditoria_created_at_idx on public.auditoria (created_at desc);
create index auditoria_entidad_idx on public.auditoria (entidad, entidad_id);
create index auditoria_usuario_idx on public.auditoria (usuario_id, created_at desc);
create index auditoria_regional_idx on public.auditoria (regional_id, created_at desc);
create index auditoria_accion_idx on public.auditoria (accion, created_at desc);

-- Último número emitido por regional y tipo (app.siguiente_numero).
create table public.correlativo (
  regional_id uuid not null references public.regional (id),
  tipo_documento text not null check (tipo_documento in (
    'nota_venta', 'ingreso', 'salida', 'retorno', 'traspaso', 'ajuste', 'devolucion', 'cobranza'
  )),
  ultimo integer not null default 0,
  primary key (regional_id, tipo_documento)
);
