import type { CondicionPago, LineaComercial, Producto, StockFila } from '@/core/models/maestros'
import { POR_PAGINA } from '@/core/models/maestros'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioCatalogo } from './catalogo.service'

const COLUMNAS_PRODUCTO = 'id, codigo, nombre, linea_id, orden, precio_base, stock_minimo, activo, linea_comercial(nombre)'

/** Quita los caracteres que rompen el filtro `or()` de PostgREST. */
export function textoBusqueda(q: string): string {
  return q.replace(/[,()*%\\]/g, ' ').trim()
}

// Contrato §4: lecturas directas a tablas/vistas con la RLS de la base.
// Todas respetan el AbortSignal de TanStack Query (regla 19).
export const catalogoSupabase: ServicioCatalogo = {
  async productosActivos(opciones) {
    let consulta = supabase().from('producto').select(COLUMNAS_PRODUCTO).eq('activo', true).order('linea_comercial(orden)').order('orden')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Producto[]>(await consulta)
  },

  async productos(filtros, pagina, opciones) {
    let consulta = supabase()
      .from('producto')
      .select(COLUMNAS_PRODUCTO, { count: 'exact' })
      .order('linea_comercial(orden)')
      .order('orden')
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    const q = textoBusqueda(filtros.q)
    if (q) consulta = consulta.or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%`)
    if (filtros.lineaId) consulta = consulta.eq('linea_id', filtros.lineaId)
    if (filtros.estado !== 'todos') consulta = consulta.eq('activo', filtros.estado === 'activos')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<Producto[]>(respuesta), total: respuesta.count ?? 0 }
  },

  async guardarProducto(id, datos) {
    const fila = { ...datos, nombre: datos.nombre.trim().toUpperCase(), codigo: datos.codigo?.trim() || null }
    const consulta = id ? supabase().from('producto').update(fila).eq('id', id) : supabase().from('producto').insert(fila)
    return dato<Producto>(await consulta.select(COLUMNAS_PRODUCTO).single())
  },

  async stockDeProductos(ids, regionalId, opciones) {
    let consulta = supabase()
      .from('v_stock')
      .select('producto_id, producto_nombre, linea_id, linea_nombre, orden, regional_id, ubicacion, almacen_id, almacen_nombre, vendedor_id, vendedor_nombre, cantidad, stock_minimo, bajo_minimo, precio_base')
      .in('producto_id', ids)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<StockFila[]>(await consulta)
  },

  async lineas(opciones) {
    let consulta = supabase().from('linea_comercial').select('id, nombre, orden, activo').order('orden')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<LineaComercial[]>(await consulta)
  },

  async guardarLinea(id, datos) {
    const fila = { ...datos, nombre: datos.nombre.trim().toUpperCase() }
    const consulta = id ? supabase().from('linea_comercial').update(fila).eq('id', id) : supabase().from('linea_comercial').insert(fila)
    return dato<LineaComercial>(await consulta.select('id, nombre, orden, activo').single())
  },

  // Solo se actualizan las líneas que cambiaron de lugar (al mover una con
  // las flechas son dos), en paralelo (regla 20).
  async reordenarLineas(cambios) {
    const respuestas = await Promise.all(cambios.map(({ id, orden }) => supabase().from('linea_comercial').update({ orden }).eq('id', id)))
    respuestas.forEach((r) => dato(r))
  },

  async condiciones(opciones) {
    let consulta = supabase().from('condicion_pago').select('id, nombre, tipo, dias, orden, activo').order('orden')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<CondicionPago[]>(await consulta)
  },

  async guardarCondicion(id, datos) {
    const fila = { ...datos, nombre: datos.nombre.trim() }
    const consulta = id ? supabase().from('condicion_pago').update(fila).eq('id', id) : supabase().from('condicion_pago').insert(fila)
    return dato<CondicionPago>(await consulta.select('id, nombre, tipo, dias, orden, activo').single())
  },
}
