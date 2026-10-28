import type { CumplimientoPresupuesto, DashboardKpis, VentaRegionalMes } from '@/core/models/dashboard'
import type { NotaVentaResumen } from '@/core/models/nota-venta'
import { dato, supabase } from '@/lib/supabase'
import type { ServicioDashboard } from './dashboard.service'

// Contrato de API §6 (dashboard_kpis, reporte_ventas_regional, cumplimiento_presupuesto) y §4 (v_nota_venta).
// Todas las peticiones respetan el AbortSignal de TanStack Query (regla 19).
export const dashboardSupabase: ServicioDashboard = {
  async kpis(regionalId, rango, opciones) {
    let peticion = supabase().rpc('dashboard_kpis', { p_regional_id: regionalId, p_desde: rango?.desde ?? null, p_hasta: rango?.hasta ?? null })
    if (opciones?.signal) peticion = peticion.abortSignal(opciones.signal)
    return dato<DashboardKpis>(await peticion)
  },

  async ventasPorRegional(desde, hasta, opciones) {
    let peticion = supabase().rpc('reporte_ventas_regional', { p_desde: desde, p_hasta: hasta })
    if (opciones?.signal) peticion = peticion.abortSignal(opciones.signal)
    return dato<VentaRegionalMes[]>(await peticion)
  },

  async cumplimiento(periodo, regionalId, opciones) {
    let peticion = supabase().rpc('cumplimiento_presupuesto', { p_periodo: periodo, p_regional_id: regionalId })
    if (opciones?.signal) peticion = peticion.abortSignal(opciones.signal)
    return dato<CumplimientoPresupuesto[]>(await peticion)
  },

  async ultimasNotas(regionalId, limite, rango, opciones) {
    let consulta = supabase()
      .from('v_nota_venta')
      .select(
        'id, numero, regional_id, regional_codigo, fecha, cliente_id, cliente_nombre, vendedor_id, vendedor_nombre, condicion_tipo, condicion_nombre, numero_factura, total, saldo, estado, pendiente_factura',
      )
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false })
      .limit(limite)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (rango) consulta = consulta.gte('fecha', rango.desde).lte('fecha', rango.hasta)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<NotaVentaResumen[]>(await consulta)
  },
}
