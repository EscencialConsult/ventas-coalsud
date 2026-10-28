// Formas del Contrato de API §6 (lecturas calculadas).

/**
 * rpc('dashboard_kpis', p_regional_id, p_desde?, p_hasta?). Solo lo que el
 * dashboard no puede derivar de datos ya cargados: los contadores salen de
 * avisos_shell y el % de presupuesto de cumplimiento_presupuesto (regla 32).
 * Sin desde/hasta, el período es el mes en curso (⚙ DT-23).
 */
export interface DashboardKpis {
  ventas_hoy: number
  ventas_periodo: number
  /** Mes en curso: vs el mismo tramo del mes anterior. Con rango: vs los N días anteriores. */
  variacion_pct: number | null
  /** Ventas netas por día del período (sparkline, ⚙ DT-21). */
  serie: VentaDia[]
  /** Solo para el nacional (Q2). */
  cxc?: { saldo: number; vencido: number }
}

export interface VentaDia {
  fecha: string
  ventas: number
}

/** rpc('avisos_shell'): badges del menú, campana y BannerDia, en un solo request. */
export interface Avisos {
  bajo_minimo: number
  notas_sin_factura: number
  /** Días anteriores a hoy que siguen abiertos. */
  dias_pendientes: DiaPendiente[]
}

export interface DiaPendiente {
  regional_id: string
  fecha: string
  notas_sin_factura: number
}

/** rpc('reporte_ventas_regional') */
export interface VentaRegionalMes {
  regional_id: string
  regional: string
  mes: string
  ventas_netas: number
}

export type EstadoPresupuesto = 'cumplido' | 'en_camino' | 'en_riesgo' | 'bajo' | 'no_cumplido'

/** rpc('cumplimiento_presupuesto') */
export interface CumplimientoPresupuesto {
  presupuesto_id: string
  periodo: string
  regional: string
  vendedor: string | null
  categoria: string | null
  meta: number
  real: number
  cumplimiento_pct: number
  proyeccion: number | null
  estado: EstadoPresupuesto
}
