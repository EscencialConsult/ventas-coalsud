-- Cobranzas, cartera inicial e ingresos por vendedor (Contrato de API §5.3 y §6, Reglas §5 y §7.2). BE-17.

-- vencido / dias_mora de las vistas se calculan a hoy.
grant execute on function app.hoy() to authenticated;

-- Saldo pendiente de un documento de la cartera inicial: importe − cobranzas vigentes (Reglas §5).
create function app.saldo_cartera(p_cxc uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select s.importe - coalesce((select sum(c.importe) from public.cobranza c where c.cxc_saldo_inicial_id = s.id and c.estado = 'vigente'), 0)
  from public.cxc_saldo_inicial s where s.id = p_cxc;
$$;

revoke execute on all functions in schema app from public;

-- Lecturas ---------------------------------------------------------------------------------

-- Documentos por cobrar: notas a crédito emitidas + cartera inicial, con saldo a hoy (Reglas §5).
create view public.v_saldo_documento with (security_invoker = true) as
with documentos as (
  select 'nota'::text as tipo_doc, n.id as documento_id, n.regional_id, n.cliente_id, n.cliente_nombre, n.vendedor_id,
    n.numero, n.numero_factura, n.fecha, n.fecha_vencimiento, n.total as importe, n.cobrado, n.abonado, n.saldo
  from public.v_nota_venta n
  where n.estado = 'emitida' and n.condicion_tipo = 'credito'
  union all
  select 'saldo_inicial', s.id, s.regional_id, s.cliente_id, c.nombre, c.vendedor_id,  -- cartera: vendedor del cliente (Reglas §7.2)
    s.numero_documento, null, s.fecha_documento, coalesce(s.fecha_vencimiento, s.fecha_documento), s.importe,
    s.importe - sal.saldo, 0, sal.saldo
  from public.cxc_saldo_inicial s
  join public.cliente c on c.id = s.cliente_id
  cross join lateral (
    select s.importe - coalesce((select sum(x.importe) from public.cobranza x where x.cxc_saldo_inicial_id = s.id and x.estado = 'vigente'), 0) as saldo
  ) sal
)
select d.*,
  d.saldo > 0 and d.fecha_vencimiento < app.hoy() as vencido,
  case when d.saldo > 0 and d.fecha_vencimiento < app.hoy() then app.hoy() - d.fecha_vencimiento else 0 end as dias_mora
from documentos d;

-- Cobranzas con su documento, cliente y vendedor (⚙ DT-27).
create view public.v_cobranza with (security_invoker = true) as
select
  co.*,
  case when co.nota_venta_id is not null then 'nota' else 'saldo_inicial' end as tipo_doc,
  coalesce(n.cliente_id, s.cliente_id) as cliente_id,
  cl.nombre as cliente_nombre,
  coalesce(n.numero, s.numero_documento) as documento_numero,
  n.numero_factura,
  coalesce(n.vendedor_id, cl.vendedor_id) as vendedor_id,  -- cartera: vendedor del cliente (Reglas §7.2)
  co.fecha <= app.ultimo_cierre(co.regional_id) as dia_cerrado,
  app.nombre_usuario(co.usuario_id) as usuario_nombre
from public.cobranza co
left join public.nota_venta n on n.id = co.nota_venta_id
left join public.cxc_saldo_inicial s on s.id = co.cxc_saldo_inicial_id
join public.cliente cl on cl.id = coalesce(n.cliente_id, s.cliente_id);

grant select on public.v_saldo_documento, public.v_cobranza to authenticated;

-- Registrar cobranzas ----------------------------------------------------------------------
-- Un cobro del cliente repartido en varios documentos: una cobranza CB-LP-… por aplicación (⚠ SUP-22),
-- todas en una transacción (si una falla, no queda ninguna).
create function public.registrar_cobranzas(
  p_regional_id uuid, p_fecha date, p_forma_pago text, p_referencia_pago text, p_observaciones text, p_aplicaciones jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_aplicacion jsonb;
  v_tipo text;
  v_documento uuid;
  v_importe numeric;
  v_nota public.nota_venta;
  v_cxc public.cxc_saldo_inicial;
  v_numero_doc text;
  v_saldo numeric;
  v_vistos uuid[] := '{}';
  v_cobranza public.cobranza;
  v_resultado jsonb := '[]';
begin
  perform app.exigir_escritura(p_regional_id);
  if p_forma_pago is null or p_forma_pago not in ('efectivo', 'transferencia', 'qr', 'cheque', 'deposito', 'otro') then
    perform app.error('VALIDACION', 'Elija la forma de pago.', jsonb_build_object('campo', 'forma_pago', 'motivo', 'invalida'));
  end if;
  if jsonb_typeof(p_aplicaciones) is distinct from 'array' or jsonb_array_length(p_aplicaciones) = 0 then
    perform app.error('VALIDACION', 'Elija al menos un documento a cobrar.', jsonb_build_object('campo', 'aplicaciones', 'motivo', 'vacio'));
  end if;
  perform app.asegurar_dia_abierto(p_regional_id, p_fecha);

  for v_aplicacion in select * from jsonb_array_elements(p_aplicaciones) loop
    begin
      v_tipo := v_aplicacion ->> 'tipo_doc';
      v_documento := (v_aplicacion ->> 'documento_id')::uuid;
      v_importe := (v_aplicacion ->> 'importe')::numeric;
    exception when others then
      v_documento := null;
    end;
    if v_tipo is null or v_tipo not in ('nota', 'saldo_inicial') or v_documento is null
       or v_importe is null or v_importe <= 0 or v_importe <> round(v_importe, 2) then
      perform app.error('VALIDACION', 'Hay una aplicación con documento o importe inválido.',
        jsonb_build_object('campo', 'aplicaciones', 'motivo', 'formato'));
    end if;
    if v_documento = any (v_vistos) then
      perform app.error('VALIDACION', 'Un documento aparece dos veces en el cobro.',
        jsonb_build_object('campo', 'aplicaciones', 'documento_id', v_documento, 'motivo', 'repetido'));
    end if;
    v_vistos := v_vistos || v_documento;

    -- documento de la regional, bloqueado para que dos cobros simultáneos no excedan el saldo
    if v_tipo = 'nota' then
      select * into v_nota from public.nota_venta where id = v_documento for update;
      if not found or v_nota.regional_id <> p_regional_id then
        perform app.error('VALIDACION', 'El documento no es de esta regional.', jsonb_build_object('campo', 'documento_id', 'motivo', 'otra_regional'));
      end if;
      if v_nota.estado = 'anulada' then
        perform app.error('NOTA_ANULADA', format('La nota %s está anulada.', v_nota.numero), jsonb_build_object('numero', v_nota.numero));
      end if;
      if v_nota.condicion_tipo = 'contado' then
        perform app.error('DOCUMENTO_CONTADO', format('La nota %s es al contado: no tiene saldo por cobrar.', v_nota.numero));
      end if;
      v_numero_doc := v_nota.numero;
      select c.saldo into v_saldo from app.cuenta_nota(v_nota.id) c;
    else
      select * into v_cxc from public.cxc_saldo_inicial where id = v_documento for update;
      if not found or v_cxc.regional_id <> p_regional_id then
        perform app.error('VALIDACION', 'El documento no es de esta regional.', jsonb_build_object('campo', 'documento_id', 'motivo', 'otra_regional'));
      end if;
      v_numero_doc := v_cxc.numero_documento;
      v_saldo := app.saldo_cartera(v_cxc.id);
    end if;

    if v_importe > v_saldo then
      perform app.error('IMPORTE_EXCEDE_SALDO', format('El importe (%s) supera el saldo de %s (%s).', v_importe, v_numero_doc, v_saldo),
        jsonb_build_object('documento', v_numero_doc, 'saldo', v_saldo));
    end if;

    insert into public.cobranza (numero, regional_id, fecha, nota_venta_id, cxc_saldo_inicial_id, forma_pago, referencia_pago, importe, observaciones, usuario_id)
    values (
      app.siguiente_numero(p_regional_id, 'cobranza'), p_regional_id, p_fecha,
      case when v_tipo = 'nota' then v_documento end, case when v_tipo = 'saldo_inicial' then v_documento end,
      p_forma_pago, nullif(btrim(p_referencia_pago), ''), v_importe, nullif(btrim(p_observaciones), ''), auth.uid()
    )
    returning * into v_cobranza;

    perform app.auditar('registrar_cobranza', 'cobranza', v_cobranza.id::text, p_regional_id, jsonb_build_object(
      'numero', v_cobranza.numero, 'documento', v_numero_doc, 'importe', v_importe, 'forma_pago', p_forma_pago));
    v_resultado := v_resultado || jsonb_build_object('id', v_cobranza.id, 'numero', v_cobranza.numero, 'documento_id', v_documento, 'importe', v_cobranza.importe);
  end loop;

  return v_resultado;
end $$;

-- Anular cobranza: vigente, de un día abierto y con motivo. No deja reembolsos por encima de lo cobrado.
create function public.anular_cobranza(p_cobranza_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cobranza public.cobranza;
  v_cuenta record;
begin
  select * into v_cobranza from public.cobranza where id = p_cobranza_id for update;
  if not found then
    perform app.error('NO_ENCONTRADO', 'La cobranza no existe.', jsonb_build_object('entidad', 'cobranza', 'id', p_cobranza_id));
  end if;
  perform app.exigir_escritura(v_cobranza.regional_id);
  if v_cobranza.estado = 'anulada' then
    perform app.error('COBRANZA_NO_ANULABLE', format('La cobranza %s ya está anulada.', v_cobranza.numero));
  end if;
  if nullif(btrim(p_motivo), '') is null then
    perform app.error('VALIDACION', 'El motivo de la anulación es obligatorio.', jsonb_build_object('campo', 'motivo', 'motivo', 'vacio'));
  end if;
  if v_cobranza.fecha <= app.ultimo_cierre(v_cobranza.regional_id) then
    perform app.error('COBRANZA_NO_ANULABLE', format('El día de la cobranza %s está cerrado: no se puede anular.', v_cobranza.numero));
  end if;
  if v_cobranza.nota_venta_id is not null then
    select * into v_cuenta from app.cuenta_nota(v_cobranza.nota_venta_id);
    if v_cuenta.cobrado - v_cobranza.importe < v_cuenta.reembolsado then
      perform app.error('COBRANZA_NO_ANULABLE', 'La nota tiene reembolsos que superarían lo cobrado: no se puede anular.');
    end if;
  end if;

  -- bloquea el día contra un cierre concurrente
  perform app.asegurar_dia_abierto(v_cobranza.regional_id, v_cobranza.fecha);

  update public.cobranza
  set estado = 'anulada', motivo_anulacion = btrim(p_motivo), anulada_por = auth.uid(), anulada_en = now()
  where id = v_cobranza.id;

  perform app.auditar('anular_cobranza', 'cobranza', v_cobranza.id::text, v_cobranza.regional_id,
    jsonb_build_object('numero', v_cobranza.numero, 'importe', v_cobranza.importe, 'motivo', btrim(p_motivo)));
  return jsonb_build_object('id', v_cobranza.id, 'estado', 'anulada');
end $$;

-- Cartera inicial: documentos pendientes a la fecha de corte D0, solo el nacional (⚠ SUP-24).
create function public.cargar_cartera_inicial(p_regional_id uuid, p_documentos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_doc jsonb;
  v_cliente public.cliente;
  v_numero text;
  v_fecha date;
  v_vencimiento date;
  v_importe numeric;
  v_total numeric := 0;
  v_insertados int := 0;
begin
  perform app.exigir_nacional();
  if not exists (select 1 from public.regional where id = p_regional_id) then
    perform app.error('VALIDACION', 'Elija la regional.', jsonb_build_object('campo', 'regional_id', 'motivo', 'vacio'));
  end if;
  if jsonb_typeof(p_documentos) is distinct from 'array' or jsonb_array_length(p_documentos) = 0 then
    perform app.error('VALIDACION', 'No hay documentos para cargar.', jsonb_build_object('campo', 'documentos', 'motivo', 'vacio'));
  end if;

  for v_doc in select * from jsonb_array_elements(p_documentos) loop
    begin
      select * into v_cliente from public.cliente where id = (v_doc ->> 'cliente_id')::uuid;
      v_numero := nullif(btrim(v_doc ->> 'numero_documento'), '');
      v_fecha := (v_doc ->> 'fecha_documento')::date;
      v_vencimiento := (v_doc ->> 'fecha_vencimiento')::date;
      v_importe := (v_doc ->> 'importe')::numeric;
    exception when others then
      v_numero := null;
    end;
    if v_cliente.id is null or v_cliente.regional_id <> p_regional_id then
      perform app.error('VALIDACION', format('El cliente del documento %s no es de esta regional.', coalesce(v_numero, '')),
        jsonb_build_object('campo', 'cliente_id', 'numero', v_numero, 'motivo', 'otra_regional'));
    end if;
    if v_numero is null or v_fecha is null or v_fecha > app.hoy() or v_importe is null or v_importe <= 0 or v_importe <> round(v_importe, 2)
       or (v_vencimiento is not null and v_vencimiento < v_fecha) then
      perform app.error('VALIDACION', format('El documento %s tiene datos inválidos (número, fechas o importe).', coalesce(v_numero, 'sin número')),
        jsonb_build_object('campo', 'documentos', 'numero', v_numero, 'motivo', 'formato'));
    end if;

    begin
      insert into public.cxc_saldo_inicial (regional_id, cliente_id, numero_documento, fecha_documento, fecha_vencimiento, importe, observaciones, usuario_id)
      values (p_regional_id, v_cliente.id, v_numero, v_fecha, v_vencimiento, v_importe, nullif(btrim(v_doc ->> 'observaciones'), ''), auth.uid());
    exception when unique_violation then
      perform app.error('DUPLICADO', format('El documento %s ya está cargado en esta regional.', v_numero),
        jsonb_build_object('campo', 'numero_documento', 'numero', v_numero));
    end;
    v_insertados := v_insertados + 1;
    v_total := v_total + v_importe;
  end loop;

  perform app.auditar('cargar_cartera_inicial', 'cxc_saldo_inicial', p_regional_id::text, p_regional_id,
    jsonb_build_object('documentos', v_insertados, 'total', v_total));
  return jsonb_build_object('insertados', v_insertados);
end $$;

-- Ingresos por vendedor en el período (Reglas §7.2, ⚙ DT-27). Security invoker: respeta la RLS.
create function public.ingresos_vendedores(p_regional_id uuid default null, p_desde date default null, p_hasta date default null, p_detalle boolean default false)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with periodo as (select coalesce(p_desde, '-infinity'::date) as desde, coalesce(p_hasta, 'infinity'::date) as hasta),
  notas as (
    select n.* from public.v_nota_venta n, periodo p
    where (p_regional_id is null or n.regional_id = p_regional_id) and n.fecha between p.desde and p.hasta
  ),
  cobros as (
    select c.vendedor_id, sum(c.importe) as total from public.v_cobranza c, periodo p
    where c.estado = 'vigente' and (p_regional_id is null or c.regional_id = p_regional_id) and c.fecha between p.desde and p.hasta
    group by c.vendedor_id
  ),
  reembolsos as (
    select n.vendedor_id, sum(d.importe) as total from public.v_devolucion d join public.nota_venta n on n.id = d.nota_venta_id, periodo p
    where d.tipo_reverso = 'reembolso' and (p_regional_id is null or d.regional_id = p_regional_id) and d.fecha between p.desde and p.hasta
    group by n.vendedor_id
  ),
  vendedores as (
    select vendedor_id from notas union select vendedor_id from cobros union select vendedor_id from reembolsos
  ),
  filas as (
    select v.nombre,
      jsonb_build_object(
        'vendedor_id', v.id,
        'vendedor', v.nombre,
        'notas', (select count(*) from notas n where n.vendedor_id = v.id and n.estado = 'emitida'),
        'ventas_contado', contado.total,
        'ventas_credito', (select coalesce(sum(n.total), 0) from notas n where n.vendedor_id = v.id and n.estado = 'emitida' and n.condicion_tipo = 'credito'),
        'cobranzas', coalesce(co.total, 0),
        'reembolsos', coalesce(re.total, 0),
        'ingreso', contado.total + coalesce(co.total, 0) - coalesce(re.total, 0)
      )
      || case when p_detalle then jsonb_build_object('detalle', (
           select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'numero', n.numero, 'fecha', n.fecha, 'cliente', n.cliente_nombre,
             'condicion', n.condicion_nombre, 'total', n.total, 'estado', n.estado) order by n.fecha, n.created_at), '[]'::jsonb)
           from notas n where n.vendedor_id = v.id))
         else '{}'::jsonb end as fila
    from vendedores x
    join public.vendedor v on v.id = x.vendedor_id
    left join cobros co on co.vendedor_id = v.id
    left join reembolsos re on re.vendedor_id = v.id
    cross join lateral (
      select coalesce(sum(n.total), 0) as total from notas n where n.vendedor_id = v.id and n.estado = 'emitida' and n.condicion_tipo = 'contado'
    ) contado
  )
  select coalesce(jsonb_agg(f.fila order by f.nombre), '[]'::jsonb) from filas f;
$$;

revoke all on function
  public.registrar_cobranzas(uuid, date, text, text, text, jsonb),
  public.anular_cobranza(uuid, text),
  public.cargar_cartera_inicial(uuid, jsonb),
  public.ingresos_vendedores(uuid, date, date, boolean)
  from public, anon;
grant execute on function
  public.registrar_cobranzas(uuid, date, text, text, text, jsonb),
  public.anular_cobranza(uuid, text),
  public.cargar_cartera_inicial(uuid, jsonb),
  public.ingresos_vendedores(uuid, date, date, boolean)
  to authenticated;
