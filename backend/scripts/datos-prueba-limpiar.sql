-- Borra la operación cargada por datos-prueba.sql (⚙ DT-43): notas, inventario, cobranzas, devoluciones,
-- cartera inicial, liquidaciones, metas, correlativos, su auditoría y los clientes extra (@prueba.coalsud).
-- Deja los datos base y los seeds (usuarios, catálogo, clientes y vendedores de prueba). Solo dev, nunca prod.
-- Uso: psql "$SUPABASE_DB_URL" -X -f scripts/datos-prueba-limpiar.sql   (npm run db:datos-prueba:limpiar)
\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
-- apaga los triggers (inmutabilidad, auditoría, bloqueo de día) solo dentro de esta transacción
set local session_replication_role = replica;

delete from public.auditoria
where entidad in ('nota_venta', 'cobranza', 'devolucion', 'documento_inventario', 'liquidacion', 'cxc_saldo_inicial', 'presupuesto')
   or (entidad = 'cliente' and entidad_id in (select id::text from public.cliente where email like '%@prueba.coalsud'));

truncate public.liquidacion_linea, public.liquidacion, public.cobranza, public.devolucion_item, public.devolucion,
  public.movimiento_inventario, public.stock_saldo, public.nota_venta_item, public.nota_venta,
  public.documento_inventario_item, public.documento_inventario, public.cxc_saldo_inicial, public.presupuesto,
  public.correlativo;

delete from public.cliente where email like '%@prueba.coalsud';

select (select count(*) from public.nota_venta) as notas, (select count(*) from public.movimiento_inventario) as movimientos,
  (select count(*) from public.cliente) as clientes, (select count(*) from public.auditoria) as auditoria;
commit;
