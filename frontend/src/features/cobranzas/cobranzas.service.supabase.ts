import type { Cobranza, CobroRegistrado, EstadoCobranza, IngresoVendedor } from '@/core/models/cobranzas'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioCobranzas } from './cobranzas.service'

const COLUMNAS =
  'id, numero, regional_id, fecha, tipo_doc, nota_venta_id, cxc_saldo_inicial_id, documento_numero, numero_factura, cliente_id, cliente_nombre, vendedor_id, forma_pago, referencia_pago, importe, estado, motivo_anulacion, anulada_en, observaciones, dia_cerrado, usuario_nombre, created_at'

// Contrato §4 (v_cobranza ⚙ DT-27) y §5.3.
export const cobranzasSupabase: ServicioCobranzas = {
  async deNota(notaId, opciones) {
    let consulta = supabase().from('v_cobranza').select(COLUMNAS).eq('nota_venta_id', notaId).order('fecha').order('numero')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Cobranza[]>(await consulta)
  },

  async delDia(regionalId, fecha, opciones) {
    let consulta = supabase().from('v_cobranza').select(COLUMNAS).eq('regional_id', regionalId).eq('fecha', fecha).order('numero')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Cobranza[]>(await consulta)
  },

  async registrar(c) {
    const respuesta = await supabase().rpc('registrar_cobranzas', {
      p_regional_id: c.regional_id,
      p_fecha: c.fecha,
      p_forma_pago: c.forma_pago,
      p_referencia_pago: c.referencia_pago,
      p_observaciones: c.observaciones,
      p_aplicaciones: c.aplicaciones,
    })
    return dato<CobroRegistrado[]>(respuesta)
  },

  async anular(id, motivo) {
    return dato<{ id: string; estado: EstadoCobranza }>(await supabase().rpc('anular_cobranza', { p_cobranza_id: id, p_motivo: motivo }))
  },

  async ingresosVendedores(regionalId, desde, hasta, detalle, opciones) {
    let consulta = supabase().rpc('ingresos_vendedores', { p_regional_id: regionalId, p_desde: desde, p_hasta: hasta, p_detalle: detalle })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<IngresoVendedor[]>(await consulta)
  },

  async cargarCartera(regionalId, documentos) {
    return dato<{ insertados: number }>(await supabase().rpc('cargar_cartera_inicial', { p_regional_id: regionalId, p_documentos: documentos }))
  },
}
