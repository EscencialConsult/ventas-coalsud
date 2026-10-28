-- Bucket privado de PDFs de factura y sus políticas (Seguridad RLS §7).
-- Ruta: {regional_id}/{nota_venta_id}.pdf. Subir se permite con el día cerrado (⚠ SUP-06).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 10485760, array['application/pdf']);

-- Regional dueña del archivo: la primera carpeta de la ruta (null si no es un uuid, en vez de un error de cast).
create function app.carpeta_regional(p_ruta text)
returns uuid language sql stable set search_path = '' as $$
  select case
    when (storage.foldername(p_ruta))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_ruta))[1])::uuid
  end;
$$;

revoke execute on all functions in schema app from public;
grant execute on function app.carpeta_regional(text) to authenticated;

create policy facturas_select on storage.objects for select to authenticated
  using (bucket_id = 'facturas' and app.carpeta_regional(name) in (select app.mis_regionales()));

create policy facturas_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas' and app.puede_escribir_regional(app.carpeta_regional(name)));

-- sin DELETE: reemplazar = subir con upsert; la ruta guardada en la nota la fija registrar_factura_nota
create policy facturas_update on storage.objects for update to authenticated
  using (bucket_id = 'facturas' and app.puede_escribir_regional(app.carpeta_regional(name)));
