import type { EstadoLiquidacion, Liquidacion, PieLiquidacion, ReporteLiquidacion } from '@/core/models/liquidacion'
import { POR_PAGINA } from '@/core/models/maestros'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioLiquidacion } from './liquidacion.service'

const COLUMNAS =
  'id, regional_id, regional_codigo, fecha, estado, total_contado_bruto, total_credito_bruto, descuento_contado, descuento_credito, total_cobranzas, total_reembolsos, total_ventas, total_efectivo, cerrada_por_nombre, cerrada_en'

// Contrato §5.4, §6.1 y v_liquidacion.
export const liquidacionSupabase: ServicioLiquidacion = {
  async reporte(regionalId, fecha, opciones) {
    let consulta = supabase().rpc('reporte_liquidacion', { p_regional_id: regionalId, p_fecha: fecha })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<ReporteLiquidacion>(await consulta)
  },

  async cerrar(regionalId, fecha) {
    return dato<{ id: string; estado: EstadoLiquidacion; totales: PieLiquidacion }>(await supabase().rpc('cerrar_liquidacion', { p_regional_id: regionalId, p_fecha: fecha }))
  },

  async reabrir(regionalId, fecha, motivo) {
    return dato<{ id: string; estado: EstadoLiquidacion }>(await supabase().rpc('reabrir_liquidacion', { p_regional_id: regionalId, p_fecha: fecha, p_motivo: motivo }))
  },

  async historial(regionalId, f, pagina, opciones) {
    let consulta = supabase()
      .from('v_liquidacion')
      .select(COLUMNAS, { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('regional_codigo')
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (f.desde) consulta = consulta.gte('fecha', f.desde)
    if (f.hasta) consulta = consulta.lte('fecha', f.hasta)
    if (f.estado) consulta = consulta.eq('estado', f.estado)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    const respuesta = await consulta
    return { filas: dato<Liquidacion[]>(respuesta), total: respuesta.count ?? 0 }
  },
}
