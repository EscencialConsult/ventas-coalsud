import type { FormaPago, TipoReverso } from './cobranzas'
import type { CondicionTipo, EstadoNota } from './nota-venta'

// Liquidación / reporte diario (Contrato §5.4 y §6.1, Reglas §3).

export type EstadoLiquidacion = 'abierta' | 'cerrada'

/** Una fila de la matriz: un producto en el día (Reglas §3.1). */
export interface FilaLiquidacion {
  producto_id: string
  producto: string
  orden: number
  precio_unit: number
  saldo_inicial: number
  pedido: number
  traspaso: number
  devolucion: number
  ajuste: number
  venta_contado_q: number
  venta_contado_bs: number
  venta_credito_q: number
  venta_credito_bs: number
  total_ventas_q: number
  total_ventas_bs: number
  saldo_final: number
  con_movimiento: boolean
}

export interface LineaLiquidacion {
  linea_id: string
  linea: string
  orden_linea: number
  productos: FilaLiquidacion[]
}

export interface PieLiquidacion {
  contado_bruto: number
  credito_bruto: number
  descuento_contado: number
  descuento_credito: number
  contado_neto: number
  credito_neto: number
  total_ventas: number
}

export interface ArqueoLiquidacion {
  contado: number
  credito: number
  cobranzas: number
  reembolsos: number
  total_ventas: number
  total_efectivo: number
  cobranzas_por_forma: { forma_pago: FormaPago; importe: number }[]
}

/** `rpc('reporte_liquidacion')` (Contrato §6.1, + `ultimo_cerrado` ⚙ DT-28). */
export interface ReporteLiquidacion {
  regional: { id: string; codigo: string; nombre: string }
  fecha: string
  estado: EstadoLiquidacion
  cerrada_por: string | null
  cerrada_en: string | null
  /** Último día cerrado de la regional: el único que el nacional puede reabrir (⚠ SUP-21). */
  ultimo_cerrado: string | null
  columnas_extra: { devolucion: boolean; ajuste: boolean }
  lineas: LineaLiquidacion[]
  pie: PieLiquidacion
  arqueo: ArqueoLiquidacion
  notas: { id: string; numero: string; numero_factura: string | null; cliente: string; vendedor: string; condicion: CondicionTipo; total: number; estado: EstadoNota }[]
  subtotales_notas: { contado: number; credito: number; total: number; cantidad: number }
  cobranzas: { id: string; numero: string; cliente: string; documento: string; forma_pago: FormaPago; referencia: string | null; importe: number }[]
  devoluciones: { id: string; numero: string; nota: string; cliente: string; tipo_reverso: TipoReverso; importe: number }[]
  validaciones_cierre: {
    dias_anteriores_abiertos: string[]
    notas_sin_factura: { id: string; numero: string; cliente: string; total: number }[]
  }
}

/** Fila de v_liquidacion (historial). Los totales se guardan al cerrar. */
export interface Liquidacion {
  id: string
  regional_id: string
  regional_codigo: string
  fecha: string
  estado: EstadoLiquidacion
  total_contado_bruto: number | null
  total_credito_bruto: number | null
  descuento_contado: number | null
  descuento_credito: number | null
  total_cobranzas: number | null
  total_reembolsos: number | null
  total_ventas: number | null
  total_efectivo: number | null
  cerrada_por_nombre: string | null
  cerrada_en: string | null
}

export interface FiltrosLiquidaciones {
  desde: string
  hasta: string
  estado: EstadoLiquidacion | ''
}
