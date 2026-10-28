import type { CumplimientoPresupuesto, DashboardKpis, VentaRegionalMes } from '@/core/models/dashboard'
import type { Rango } from '@/core/periodo/periodos'
import type { NotaVentaResumen } from '@/core/models/nota-venta'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dashboardFixtures } from './dashboard.service.fixtures'
import { dashboardSupabase } from './dashboard.service.supabase'

export interface ServicioDashboard {
  /** rango null = mes en curso. */
  kpis(regionalId: string | null, rango: Rango | null, opciones?: OpcionesPeticion): Promise<DashboardKpis>
  ventasPorRegional(desde: string, hasta: string, opciones?: OpcionesPeticion): Promise<VentaRegionalMes[]>
  cumplimiento(periodo: string, regionalId: string | null, opciones?: OpcionesPeticion): Promise<CumplimientoPresupuesto[]>
  /** rango null = las últimas, sin límite de fecha. */
  ultimasNotas(regionalId: string | null, limite: number, rango: Rango | null, opciones?: OpcionesPeticion): Promise<NotaVentaResumen[]>
}

export const dashboardService: ServicioDashboard = MODO_FIXTURES ? dashboardFixtures : dashboardSupabase
