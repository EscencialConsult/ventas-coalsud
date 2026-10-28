import type { FilaLiquidacion, ReporteLiquidacion } from '@/core/models/liquidacion'

export type ClaveNumerica = Exclude<keyof FilaLiquidacion, 'producto_id' | 'producto' | 'orden' | 'con_movimiento'>

export interface ColumnaMatriz {
  clave: ClaveNumerica
  /** Encabezado propio, o el de abajo de un grupo (Q / Bs). */
  titulo: string
  grupo?: 'VENTA CONTADO' | 'VENTA CRÉDITO' | 'TOTAL VENTAS'
  formato: 'cantidad' | 'monto' | 'signo'
  /** Clase de fondo del encabezado: los colores de la planilla F3, suaves. */
  tono: string
}

/** Columnas de la planilla F3 en su orden; Devolución y Ajuste solo si el día las tiene (⚠ SUP-10). */
export function columnasMatriz(extra: ReporteLiquidacion['columnas_extra']): ColumnaMatriz[] {
  return [
    { clave: 'precio_unit', titulo: 'P/UNIT', formato: 'monto', tono: 'bg-fondo-3' },
    { clave: 'saldo_inicial', titulo: 'SALDO INICIAL', formato: 'cantidad', tono: 'bg-planilla-inicial' },
    { clave: 'pedido', titulo: 'PEDIDO', formato: 'cantidad', tono: 'bg-planilla-pedido' },
    { clave: 'traspaso', titulo: 'TRASPASO', formato: 'signo', tono: 'bg-planilla-traspaso' },
    ...(extra.devolucion ? [{ clave: 'devolucion' as const, titulo: 'DEVOLUCIÓN', formato: 'cantidad' as const, tono: 'bg-planilla-traspaso' }] : []),
    ...(extra.ajuste ? [{ clave: 'ajuste' as const, titulo: 'AJUSTE', formato: 'signo' as const, tono: 'bg-planilla-traspaso' }] : []),
    { clave: 'venta_contado_q', titulo: 'Q', grupo: 'VENTA CONTADO', formato: 'cantidad', tono: 'bg-fondo-3' },
    { clave: 'venta_contado_bs', titulo: 'BS', grupo: 'VENTA CONTADO', formato: 'monto', tono: 'bg-fondo-3' },
    { clave: 'venta_credito_q', titulo: 'Q', grupo: 'VENTA CRÉDITO', formato: 'cantidad', tono: 'bg-planilla-credito' },
    { clave: 'venta_credito_bs', titulo: 'BS', grupo: 'VENTA CRÉDITO', formato: 'monto', tono: 'bg-planilla-credito' },
    { clave: 'saldo_final', titulo: 'SALDO FINAL', formato: 'cantidad', tono: 'bg-planilla-final' },
    { clave: 'total_ventas_q', titulo: 'Q', grupo: 'TOTAL VENTAS', formato: 'cantidad', tono: 'bg-fondo-3' },
    { clave: 'total_ventas_bs', titulo: 'BS', grupo: 'TOTAL VENTAS', formato: 'monto', tono: 'bg-fondo-3' },
  ]
}

/** Etiqueta completa para la vista de card (móvil): "Venta contado Q". */
export const etiquetaLarga = (c: ColumnaMatriz) => (c.grupo ? `${c.grupo} ${c.titulo}` : c.titulo)
