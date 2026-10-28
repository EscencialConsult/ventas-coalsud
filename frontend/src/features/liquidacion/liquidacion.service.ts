import type { EstadoLiquidacion, FiltrosLiquidaciones, Liquidacion, PieLiquidacion, ReporteLiquidacion } from '@/core/models/liquidacion'
import type { Pagina } from '@/core/models/maestros'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { liquidacionFixtures } from './liquidacion.service.fixtures'
import { liquidacionSupabase } from './liquidacion.service.supabase'

// Liquidación diaria (06-pantallas/09, CU-08): el reporte lo arma la base
// (abierta: en vivo; cerrada: del snapshot). El frontend solo lo muestra.

export interface ServicioLiquidacion {
  reporte(regionalId: string, fecha: string, opciones?: OpcionesPeticion): Promise<ReporteLiquidacion>
  cerrar(regionalId: string, fecha: string): Promise<{ id: string; estado: EstadoLiquidacion; totales: PieLiquidacion }>
  /** Solo nacional y solo el último día cerrado (⚠ SUP-21). */
  reabrir(regionalId: string, fecha: string, motivo: string): Promise<{ id: string; estado: EstadoLiquidacion }>
  historial(regionalId: string | null, filtros: FiltrosLiquidaciones, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<Liquidacion>>
}

export const liquidacionService: ServicioLiquidacion = MODO_FIXTURES ? liquidacionFixtures : liquidacionSupabase
