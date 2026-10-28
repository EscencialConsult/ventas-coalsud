import { POR_PAGINA } from '@/core/models/maestros'
import type { FacturaRegistrada, HojaCarga, ItemNota, NotaAnulada, NotaEmitida, NotaVenta } from '@/core/models/nota-venta'
import { dato, supabase } from '@/lib/supabase'
import { textoBusqueda } from '@/features/catalogo/catalogo.service.supabase'
import type { ServicioNotas } from './notas.service'

const COLUMNAS =
  'id, numero, regional_id, regional_codigo, fecha, cliente_id, cliente_nombre, cliente_nit, vendedor_id, vendedor_nombre, canal, condicion_pago_id, condicion_tipo, condicion_nombre, dias_credito, fecha_vencimiento, descuento_pct, origen_stock, numero_factura, factura_pdf_path, estado, motivo_anulacion, anulada_en, observaciones, bruto, descuento_bs, total, cobrado, abonado, saldo, pendiente_factura, tiene_devolucion, dia_cerrado, usuario_nombre, created_at'

interface FilaItem {
  producto_id: string
  cantidad: number
  precio_base: number
  precio_aplicado: number
  subtotal: number
  producto: { nombre: string; linea_comercial: { nombre: string } | null } | null
}

// Contrato §4 (v_nota_venta ⚙ DT-26, nota_venta_item), §5.2 y §7 (Storage).
export const notasSupabase: ServicioNotas = {
  async listar(regionalId, f, pagina, opciones) {
    let consulta = supabase()
      .from('v_nota_venta')
      .select(COLUMNAS, { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (f.desde) consulta = consulta.gte('fecha', f.desde)
    if (f.hasta) consulta = consulta.lte('fecha', f.hasta)
    if (f.estado) consulta = consulta.eq('estado', f.estado)
    if (f.vendedorId) consulta = consulta.eq('vendedor_id', f.vendedorId)
    if (f.condicion) consulta = consulta.eq('condicion_tipo', f.condicion)
    if (f.sinFactura) consulta = consulta.eq('pendiente_factura', true)
    const q = textoBusqueda(f.q)
    if (q) consulta = consulta.or(`numero.ilike.%${q}%,numero_factura.ilike.%${q}%,cliente_nombre.ilike.%${q}%`)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<NotaVenta[]>(respuesta), total: respuesta.count ?? 0 }
  },

  async obtener(id, opciones) {
    let nota = supabase().from('v_nota_venta').select(COLUMNAS).eq('id', id)
    let items = supabase().from('nota_venta_item').select('producto_id, cantidad, precio_base, precio_aplicado, subtotal, producto(nombre, linea_comercial(nombre))').eq('nota_venta_id', id)
    if (opciones?.signal) {
      nota = nota.abortSignal(opciones.signal)
      items = items.abortSignal(opciones.signal)
    }
    // Independientes: en paralelo (regla 20).
    const [cabecera, filas] = await Promise.all([nota.single(), items])
    const detalle: ItemNota[] = dato<FilaItem[]>(filas).map(({ producto, ...i }) => ({ ...i, producto_nombre: producto?.nombre ?? '', linea_nombre: producto?.linea_comercial?.nombre ?? '' }))
    return { ...dato<NotaVenta>(cabecera), items: detalle }
  },

  async emitir(n) {
    const respuesta = await supabase().rpc('emitir_nota_venta', {
      p_regional_id: n.regional_id,
      p_fecha: n.fecha,
      p_cliente_id: n.cliente_id,
      p_vendedor_id: n.vendedor_id,
      p_canal: n.canal,
      p_condicion_pago_id: n.condicion_pago_id,
      p_descuento_pct: n.descuento_pct,
      p_origen_stock: n.origen_stock,
      p_numero_factura: n.numero_factura,
      p_observaciones: n.observaciones,
      p_items: n.items,
    })
    return dato<NotaEmitida>(respuesta)
  },

  async registrarFactura(nota, numero, pdf) {
    let ruta: string | null = null
    if (pdf) {
      ruta = `${nota.regional_id}/${nota.id}.pdf`
      const subida = await supabase().storage.from('facturas').upload(ruta, pdf, { upsert: true, contentType: 'application/pdf' })
      dato(subida)
    }
    return dato<FacturaRegistrada>(await supabase().rpc('registrar_factura_nota', { p_nota_id: nota.id, p_numero_factura: numero, p_factura_pdf_path: ruta }))
  },

  async urlFactura(ruta) {
    return dato<{ signedUrl: string }>(await supabase().storage.from('facturas').createSignedUrl(ruta, 60)).signedUrl
  },

  async anular(id, motivo) {
    return dato<NotaAnulada>(await supabase().rpc('anular_nota_venta', { p_nota_id: id, p_motivo: motivo }))
  },

  async hojaCarga(regionalId, fecha, vendedorId, opciones) {
    let consulta = supabase().rpc('hoja_carga', { p_regional_id: regionalId, p_fecha: fecha, p_vendedor_id: vendedorId })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<HojaCarga[]>(await consulta)
  },
}
