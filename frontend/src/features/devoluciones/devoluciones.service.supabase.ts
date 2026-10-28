import type { Devolucion, DevolucionRegistrada, MaxDevolvible } from '@/core/models/cobranzas'
import { POR_PAGINA } from '@/core/models/maestros'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioDevoluciones } from './devoluciones.service'

const COLUMNAS = 'id, numero, regional_id, fecha, nota_venta_id, nota_numero, cliente_id, cliente_nombre, tipo_reverso, motivo, importe, nc_contable_numero, usuario_nombre, created_at'

// Contrato §4 (v_devolucion ⚙ DT-27), §5.2 y §6 (max_devolvible).
export const devolucionesSupabase: ServicioDevoluciones = {
  async maxDevolvible(notaId, opciones) {
    let consulta = supabase().rpc('max_devolvible', { p_nota_id: notaId })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<MaxDevolvible>(await consulta)
  },

  async registrar(d) {
    const respuesta = await supabase().rpc('registrar_devolucion', { p_nota_id: d.nota_id, p_tipo_reverso: d.tipo_reverso, p_motivo: d.motivo, p_items: d.items })
    return dato<DevolucionRegistrada>(respuesta)
  },

  async listar(regionalId, f, pagina, opciones) {
    let consulta = supabase()
      .from('v_devolucion')
      .select(COLUMNAS, { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (f.desde) consulta = consulta.gte('fecha', f.desde)
    if (f.hasta) consulta = consulta.lte('fecha', f.hasta)
    if (f.tipo) consulta = consulta.eq('tipo_reverso', f.tipo)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<Devolucion[]>(respuesta), total: respuesta.count ?? 0 }
  },

  async deNota(notaId, opciones) {
    let consulta = supabase().from('v_devolucion').select(COLUMNAS).eq('nota_venta_id', notaId).order('fecha')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Devolucion[]>(await consulta)
  },

  async registrarNc(id, numero) {
    return dato<{ id: string; nc_contable_numero: string }>(await supabase().rpc('registrar_nc_contable', { p_devolucion_id: id, p_numero: numero }))
  },
}
