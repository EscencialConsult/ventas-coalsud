-- Factura y anulación de notas, y v_nota_venta (Contrato de API §5.2, Esquema BD §2, Reglas §1, §4, §5). BE-14.

-- dia_cerrado de las vistas: el último cierre lo puede consultar quien ve la regional.
grant execute on function app.ultimo_cierre(uuid) to authenticated;

-- Notas con nombres, totales y saldo (⚙ DT-26: dia_cerrado y usuario_nombre).
create view public.v_nota_venta with (security_invoker = true) as
select
  n.*,
  r.codigo as regional_codigo,
  c.nombre as cliente_nombre,
  c.nit as cliente_nit,
  v.nombre as vendedor_nombre,
  cp.nombre as condicion_nombre,
  b.bruto,
  b.bruto - t.total as descuento_bs,
  t.total,
  co.cobrado,
  ab.abonado,
  -- crédito: total − cobranzas vigentes − abonos de devoluciones; contado o anulada: 0 (Reglas §5)
  case when n.estado = 'emitida' and n.condicion_tipo = 'credito' then t.total - co.cobrado - ab.abonado else 0 end as saldo,
  n.numero_factura is null and n.estado = 'emitida' as pendiente_factura,
  exists (select 1 from public.devolucion d where d.nota_venta_id = n.id) as tiene_devolucion,
  n.fecha <= app.ultimo_cierre(n.regional_id) as dia_cerrado,
  app.nombre_usuario(n.usuario_id) as usuario_nombre
from public.nota_venta n
join public.regional r on r.id = n.regional_id
join public.cliente c on c.id = n.cliente_id
join public.vendedor v on v.id = n.vendedor_id
join public.condicion_pago cp on cp.id = n.condicion_pago_id
cross join lateral (
  select coalesce(sum(i.subtotal), 0) as bruto from public.nota_venta_item i where i.nota_venta_id = n.id
) b
cross join lateral (select round(b.bruto * (1 - n.descuento_pct / 100), 2) as total) t
cross join lateral (
  select coalesce(sum(x.importe), 0) as cobrado from public.cobranza x where x.nota_venta_id = n.id and x.estado = 'vigente'
) co
cross join lateral (
  -- importe de cada devolución con el precio y el descuento de la nota (Reglas §4)
  select coalesce(sum(d.importe), 0) as abonado
  from (
    select round(sum(di.cantidad * di.precio_aplicado) * (1 - n.descuento_pct / 100), 2) as importe
    from public.devolucion dv
    join public.devolucion_item di on di.devolucion_id = dv.id
    where dv.nota_venta_id = n.id and dv.tipo_reverso = 'abono_cuenta'
    group by dv.id
  ) d
) ab;

grant select on public.v_nota_venta to authenticated;

-- Registrar factura --------------------------------------------------------------------------
-- Se permite con el día cerrado: no altera cantidades ni importes (⚠ SUP-06). La ruta del PDF ya está
-- subida a Storage ({regional_id}/{nota_venta_id}.pdf); nula = no cambiarla.
create function public.registrar_factura_nota(p_nota_id uuid, p_numero_factura text, p_factura_pdf_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_nota public.nota_venta;
  v_numero text := nullif(btrim(p_numero_factura), '');
  v_ruta text := coalesce(nullif(btrim(p_factura_pdf_path), ''), null);
  v_duplicado boolean;
begin
  select * into v_nota from public.nota_venta where id = p_nota_id for update;
  if not found then
    perform app.error('NO_ENCONTRADO', 'La nota no existe.', jsonb_build_object('entidad', 'nota_venta', 'id', p_nota_id));
  end if;
  perform app.exigir_escritura(v_nota.regional_id);
  if v_nota.estado = 'anulada' then
    perform app.error('NOTA_ANULADA', format('La nota %s está anulada.', v_nota.numero), jsonb_build_object('numero', v_nota.numero));
  end if;
  if v_numero is null or length(v_numero) > 30 then
    perform app.error('VALIDACION', 'El N° de factura es obligatorio (hasta 30 caracteres).',
      jsonb_build_object('campo', 'numero_factura', 'motivo', 'invalido'));
  end if;
  if v_ruta is not null and app.carpeta_regional(v_ruta) is distinct from v_nota.regional_id then
    perform app.error('VALIDACION', 'El PDF no corresponde a la regional de la nota.',
      jsonb_build_object('campo', 'factura_pdf_path', 'motivo', 'otra_regional'));
  end if;

  -- ⚠ SUP-41: avisa, no impide
  v_duplicado := exists (
    select 1 from public.nota_venta n
    where n.regional_id = v_nota.regional_id and n.id <> v_nota.id and n.estado = 'emitida' and n.numero_factura = v_numero
  );

  update public.nota_venta
  set numero_factura = v_numero, factura_pdf_path = coalesce(v_ruta, factura_pdf_path), factura_registrada_en = now()
  where id = v_nota.id;

  perform app.auditar('registrar_factura', 'nota_venta', v_nota.id::text, v_nota.regional_id, jsonb_build_object(
    'antes', jsonb_build_object('numero_factura', v_nota.numero_factura, 'factura_pdf_path', v_nota.factura_pdf_path),
    'despues', jsonb_build_object('numero_factura', v_numero, 'factura_pdf_path', coalesce(v_ruta, v_nota.factura_pdf_path)),
    'advertencia_duplicado', v_duplicado));

  return jsonb_build_object('id', v_nota.id, 'numero_factura', v_numero,
    'factura_pdf_path', coalesce(v_ruta, v_nota.factura_pdf_path), 'advertencia_duplicado', v_duplicado);
end $$;

-- Anular nota -------------------------------------------------------------------------------
-- Solo con el día de la nota abierto y sin cobranzas vigentes. Repone el stock al mismo origen
-- (almacén o vendedor) con la fecha de la nota. El número se conserva (sin huecos).
create function public.anular_nota_venta(p_nota_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_nota public.nota_venta;
  v_cobranzas jsonb;
  m record;
begin
  select * into v_nota from public.nota_venta where id = p_nota_id for update;
  if not found then
    perform app.error('NO_ENCONTRADO', 'La nota no existe.', jsonb_build_object('entidad', 'nota_venta', 'id', p_nota_id));
  end if;
  perform app.exigir_escritura(v_nota.regional_id);
  if v_nota.estado = 'anulada' then
    perform app.error('NOTA_ANULADA', format('La nota %s ya está anulada.', v_nota.numero), jsonb_build_object('numero', v_nota.numero));
  end if;
  if nullif(btrim(p_motivo), '') is null then
    perform app.error('VALIDACION', 'El motivo de la anulación es obligatorio.', jsonb_build_object('campo', 'motivo', 'motivo', 'vacio'));
  end if;
  if v_nota.fecha <= app.ultimo_cierre(v_nota.regional_id) then
    perform app.error('NOTA_NO_ANULABLE', format('El día de la nota %s está cerrado: registre una devolución.', v_nota.numero),
      jsonb_build_object('motivo', 'dia_cerrado'));
  end if;

  select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'importe', c.importe) order by c.numero) into v_cobranzas
  from public.cobranza c where c.nota_venta_id = v_nota.id and c.estado = 'vigente';
  if v_cobranzas is not null then
    perform app.error('NOTA_NO_ANULABLE', format('La nota %s tiene cobranzas vigentes: anúlelas primero.', v_nota.numero),
      jsonb_build_object('motivo', 'tiene_cobranzas', 'cobranzas', v_cobranzas));
  end if;

  -- bloquea el día de la nota contra un cierre concurrente
  perform app.asegurar_dia_abierto(v_nota.regional_id, v_nota.fecha);

  for m in select * from public.movimiento_inventario where nota_venta_id = v_nota.id and tipo = 'venta' loop
    perform app.mover(v_nota.fecha, 'anulacion', m.almacen_id, m.vendedor_id, m.producto_id, -m.cantidad, null, v_nota.id, null);
  end loop;

  update public.nota_venta
  set estado = 'anulada', motivo_anulacion = btrim(p_motivo), anulada_por = auth.uid(), anulada_en = now()
  where id = v_nota.id;

  perform app.auditar('anular_nota', 'nota_venta', v_nota.id::text, v_nota.regional_id,
    jsonb_strip_nulls(jsonb_build_object('numero', v_nota.numero, 'motivo', btrim(p_motivo), 'numero_factura', v_nota.numero_factura)));

  return jsonb_build_object('id', v_nota.id, 'estado', 'anulada', 'aviso_factura',
    case when v_nota.numero_factura is not null
      then format('Avisar a Contabilidad que anule la factura N° %s.', v_nota.numero_factura) end);
end $$;

revoke all on function
  public.registrar_factura_nota(uuid, text, text),
  public.anular_nota_venta(uuid, text)
  from public, anon;
grant execute on function
  public.registrar_factura_nota(uuid, text, text),
  public.anular_nota_venta(uuid, text)
  to authenticated;
