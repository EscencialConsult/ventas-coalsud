import type { CategoriaCliente } from './maestros'
import type { LineaLiquidacion, PieLiquidacion, ReporteLiquidacion } from './liquidacion'

// Reportes comerciales (06-pantallas/11 §1, Contrato §6, Reglas §9).

export interface FiltrosReporte {
  desde: string
  hasta: string
  vendedorId: string
  lineaId: string
  categoria: CategoriaCliente | ''
}

export interface TopCliente {
  cliente_id: string
  cliente: string
  regional: string
  categoria: CategoriaCliente
  notas: number
  ventas_netas: number
}

export interface ProductoVendido {
  producto_id: string
  producto: string
  linea: string
  unidades: number
  bs_netos: number
}

/** ⚠ SUP-35: rotación = vendidas / stock promedio; días de inventario = días del período / rotación. */
export interface RotacionProducto {
  producto_id: string
  producto: string
  linea: string
  vendidas: number
  stock_inicial: number
  stock_final: number
  stock_promedio: number
  rotacion: number
  dias_inventario: number | null
}

export interface VentaRegionalMes {
  regional_id: string
  regional: string
  /** 'AAAA-MM' */
  mes: string
  ventas_netas: number
}

/** Matriz de la liquidación acumulada en el período (⚠ SUP-54). */
export interface MovimientoPeriodo {
  lineas: LineaLiquidacion[]
  columnas_extra: ReporteLiquidacion['columnas_extra']
  pie: PieLiquidacion
}
