-- Cobranzas: cartera inicial y cobros (Esquema BD §1.18–1.19).

-- Saldos pendientes cargados al arrancar el sistema (⚠ SUP-24).
create table public.cxc_saldo_inicial (
  id uuid primary key default gen_random_uuid(),
  regional_id uuid not null references public.regional (id),
  cliente_id uuid not null,
  numero_documento text not null,
  fecha_documento date not null,
  fecha_vencimiento date,  -- nulo → se asume fecha_documento
  importe numeric(14,2) not null check (importe > 0),  -- saldo pendiente a la fecha de carga
  observaciones text,
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  unique (regional_id, numero_documento),
  foreign key (cliente_id, regional_id) references public.cliente (id, regional_id)
);

create table public.cobranza (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  regional_id uuid not null references public.regional (id),  -- = la del documento
  fecha date not null,
  nota_venta_id uuid references public.nota_venta (id),
  cxc_saldo_inicial_id uuid references public.cxc_saldo_inicial (id),
  forma_pago text not null check (forma_pago in ('efectivo', 'transferencia', 'qr', 'cheque', 'deposito', 'otro')),
  referencia_pago text,
  importe numeric(14,2) not null check (importe > 0),
  estado text not null default 'vigente' check (estado in ('vigente', 'anulada')),
  motivo_anulacion text,
  anulada_por uuid references public.usuario (id),
  anulada_en timestamptz,
  observaciones text,
  usuario_id uuid not null references public.usuario (id),
  created_at timestamptz not null default now(),
  unique (regional_id, numero),
  check (num_nonnulls(nota_venta_id, cxc_saldo_inicial_id) = 1),
  check ((estado = 'anulada') = (anulada_en is not null))
);
create index cobranza_regional_fecha_idx on public.cobranza (regional_id, fecha);
create index cobranza_nota_venta_vigente_idx on public.cobranza (nota_venta_id) where estado = 'vigente';
create index cobranza_saldo_inicial_vigente_idx on public.cobranza (cxc_saldo_inicial_id) where estado = 'vigente';
