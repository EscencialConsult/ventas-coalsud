import type { DocumentoDetalle, DocumentoInventario, DocumentoRegistrado, FilaKardex, ItemDocumento, Movimiento, SaldoVendedor } from '@/core/models/inventario'
import { POR_PAGINA, type StockFila } from '@/core/models/maestros'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioInventario } from './inventario.service'

const COLUMNAS_STOCK =
  'producto_id, producto_nombre, linea_id, linea_nombre, orden, regional_id, ubicacion, almacen_id, almacen_nombre, vendedor_id, vendedor_nombre, cantidad, stock_minimo, bajo_minimo, precio_base'

const COLUMNAS_MOVIMIENTO =
  'id, fecha, tipo, regional_id, almacen_id, almacen_nombre, vendedor_id, vendedor_nombre, producto_id, producto_nombre, cantidad, documento_id, nota_venta_id, devolucion_id, documento_numero, usuario_nombre, created_at'

const COLUMNAS_DOCUMENTO =
  'id, numero, tipo, regional_id, almacen_id, almacen_nombre, almacen_destino_id, almacen_destino_nombre, regional_destino_id, vendedor_id, vendedor_nombre, fecha, referencia, motivo, items, usuario_nombre, created_at'

const rango = (pagina: number) => [(pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1] as const

interface FilaItem {
  producto_id: string
  cantidad: number
  producto: { nombre: string; linea_comercial: { nombre: string } | null } | null
}

// Contrato §4 (v_stock, v_movimiento, v_documento_inventario ⚙ DT-25) y §5.1.
export const inventarioSupabase: ServicioInventario = {
  async stock(regionalId, opciones) {
    let consulta = supabase().from('v_stock').select(COLUMNAS_STOCK).or('ubicacion.eq.almacen,cantidad.gt.0').order('orden')
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<StockFila[]>(await consulta)
  },

  async kardex({ almacenId, vendedorId, productoId, desde, hasta }, opciones) {
    let consulta = supabase().rpc('kardex', { p_almacen_id: almacenId, p_vendedor_id: vendedorId, p_producto_id: productoId, p_desde: desde, p_hasta: hasta })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<FilaKardex[]>(await consulta)
  },

  async movimientos(regionalId, f, pagina, opciones) {
    let consulta = supabase()
      .from('v_movimiento')
      .select(COLUMNAS_MOVIMIENTO, { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(...rango(pagina))
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (f.desde) consulta = consulta.gte('fecha', f.desde)
    if (f.hasta) consulta = consulta.lte('fecha', f.hasta)
    if (f.tipo) consulta = consulta.eq('tipo', f.tipo)
    if (f.productoId) consulta = consulta.eq('producto_id', f.productoId)
    const documento = f.documento.trim().replace(/[%,()]/g, '')
    if (documento) consulta = consulta.ilike('documento_numero', `%${documento}%`)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<Movimiento[]>(respuesta), total: respuesta.count ?? 0 }
  },

  async documentos(regionalId, f, pagina, opciones) {
    let consulta = supabase()
      .from('v_documento_inventario')
      .select(COLUMNAS_DOCUMENTO, { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(...rango(pagina))
    // Los traspasos recibidos también se ven en la regional destino.
    if (regionalId) consulta = consulta.or(`regional_id.eq.${regionalId},regional_destino_id.eq.${regionalId}`)
    if (f.tipo) consulta = consulta.eq('tipo', f.tipo)
    if (f.desde) consulta = consulta.gte('fecha', f.desde)
    if (f.hasta) consulta = consulta.lte('fecha', f.hasta)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<DocumentoInventario[]>(respuesta), total: respuesta.count ?? 0 }
  },

  async documento(id, opciones) {
    let cabecera = supabase().from('v_documento_inventario').select(COLUMNAS_DOCUMENTO).eq('id', id)
    let items = supabase().from('documento_inventario_item').select('producto_id, cantidad, producto(nombre, linea_comercial(nombre))').eq('documento_id', id)
    if (opciones?.signal) {
      cabecera = cabecera.abortSignal(opciones.signal)
      items = items.abortSignal(opciones.signal)
    }
    // Independientes: en paralelo (regla 20).
    const [doc, filas] = await Promise.all([cabecera.single(), items])
    const detalle: ItemDocumento[] = dato<FilaItem[]>(filas).map((i) => ({
      producto_id: i.producto_id,
      producto_nombre: i.producto?.nombre ?? '',
      linea_nombre: i.producto?.linea_comercial?.nombre ?? '',
      cantidad: i.cantidad,
    }))
    return { ...dato<DocumentoInventario>(doc), detalle } satisfies DocumentoDetalle
  },

  async saldoVendedores(regionalId, desde, hasta, opciones) {
    let consulta = supabase().rpc('saldo_vendedores', { p_regional_id: regionalId, p_desde: desde, p_hasta: hasta })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<SaldoVendedor[]>(await consulta)
  },

  async registrar(doc) {
    const comunes = { p_fecha: doc.fecha, p_items: doc.items }
    const llamada = {
      ingreso: () => supabase().rpc('registrar_ingreso', { ...comunes, p_almacen_id: doc.almacen_id, p_referencia: doc.referencia }),
      salida: () => supabase().rpc('registrar_salida', { ...comunes, p_almacen_id: doc.almacen_id, p_vendedor_id: doc.vendedor_id, p_referencia: doc.referencia }),
      retorno: () => supabase().rpc('registrar_retorno', { ...comunes, p_almacen_id: doc.almacen_id, p_vendedor_id: doc.vendedor_id, p_referencia: doc.referencia }),
      traspaso: () => supabase().rpc('registrar_traspaso', { ...comunes, p_almacen_origen_id: doc.almacen_id, p_almacen_destino_id: doc.almacen_destino_id, p_referencia: doc.referencia }),
      ajuste: () => supabase().rpc('registrar_ajuste', { ...comunes, p_almacen_id: doc.almacen_id, p_motivo: doc.motivo }),
    }
    return dato<DocumentoRegistrado>(await llamada[doc.tipo]())
  },
}
