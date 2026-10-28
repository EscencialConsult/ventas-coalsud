import { POR_PAGINA, type Cliente, type SaldoDocumento } from '@/core/models/maestros'
import type { NotaVentaResumen } from '@/core/models/nota-venta'
import { dato, supabase } from '@/lib/supabase'
import { textoBusqueda } from '@/features/catalogo/catalogo.service.supabase'
import type { ServicioClientes } from './clientes.service'

const COLUMNAS =
  'id, regional_id, nombre, razon_social, nit, categoria, canal, vendedor_id, condicion_pago_id, zona, telefono, email, direccion, activo, vendedor(nombre), condicion_pago(nombre, tipo, dias)'

const COLUMNAS_NOTA =
  'id, numero, regional_id, regional_codigo, fecha, cliente_id, cliente_nombre, vendedor_id, vendedor_nombre, condicion_tipo, condicion_nombre, numero_factura, total, saldo, estado, pendiente_factura'

// Contrato §4: `cliente` (+ vendedor, condicion_pago) con la RLS de la base.
// Los errores 42501 llegan como NO_AUTORIZADO (mapearError).
export const clientesSupabase: ServicioClientes = {
  async listar(regionalId, filtros, pagina, opciones) {
    let consulta = supabase()
      .from('cliente')
      .select(COLUMNAS, { count: 'exact' })
      .order('nombre')
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    const q = textoBusqueda(filtros.q)
    if (q) consulta = consulta.or(`nombre.ilike.%${q}%,razon_social.ilike.%${q}%,nit.ilike.%${q}%`)
    if (filtros.categoria) consulta = consulta.eq('categoria', filtros.categoria)
    if (filtros.canal) consulta = consulta.eq('canal', filtros.canal)
    if (filtros.vendedorId) consulta = consulta.eq('vendedor_id', filtros.vendedorId)
    if (filtros.estado !== 'todos') consulta = consulta.eq('activo', filtros.estado === 'activos')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<Cliente[]>(respuesta), total: respuesta.count ?? 0 }
  },

  async obtener(id, opciones) {
    let consulta = supabase().from('cliente').select(COLUMNAS).eq('id', id)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Cliente>(await consulta.single())
  },

  async guardar(id, datos) {
    const consulta = id ? supabase().from('cliente').update(datos).eq('id', id) : supabase().from('cliente').insert(datos)
    return dato<Cliente>(await consulta.select(COLUMNAS).single())
  },

  async notas(clienteId, opciones) {
    let consulta = supabase()
      .from('v_nota_venta')
      .select(COLUMNAS_NOTA)
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false })
      .limit(100)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<NotaVentaResumen[]>(await consulta)
  },

  async porNombres(regionalId, nombres, opciones) {
    let consulta = supabase().from('cliente').select('id, nombre, regional_id').eq('regional_id', regionalId).in('nombre', nombres)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Pick<Cliente, 'id' | 'nombre' | 'regional_id'>[]>(await consulta)
  },

  async saldos(clienteId, opciones) {
    let consulta = supabase()
      .from('v_saldo_documento')
      .select('tipo_doc, documento_id, regional_id, cliente_id, numero, numero_factura, fecha, fecha_vencimiento, importe, cobrado, saldo, vencido, dias_mora')
      .eq('cliente_id', clienteId)
      .gt('saldo', 0)
      .order('fecha')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<SaldoDocumento[]>(await consulta)
  },
}
