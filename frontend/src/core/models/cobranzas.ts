// Cobranzas, devoluciones y cartera (Esquema BD §1.16–1.19, Contrato §5.2–5.3).

export type FormaPago = 'efectivo' | 'transferencia' | 'qr' | 'cheque' | 'deposito' | 'otro'
export type EstadoCobranza = 'vigente' | 'anulada'
export type TipoDocCobro = 'nota' | 'saldo_inicial'

/** Fila de v_cobranza (+ `dia_cerrado`, `usuario_nombre`, ⚙ DT-27). */
export interface Cobranza {
  id: string
  numero: string
  regional_id: string
  fecha: string
  tipo_doc: TipoDocCobro
  nota_venta_id: string | null
  cxc_saldo_inicial_id: string | null
  documento_numero: string
  numero_factura: string | null
  cliente_id: string
  cliente_nombre: string
  vendedor_id: string | null
  forma_pago: FormaPago
  referencia_pago: string | null
  importe: number
  estado: EstadoCobranza
  motivo_anulacion: string | null
  anulada_en: string | null
  observaciones: string | null
  dia_cerrado: boolean
  usuario_nombre: string
  created_at: string
}

export interface NuevoCobro {
  regional_id: string
  fecha: string
  forma_pago: FormaPago
  referencia_pago: string | null
  observaciones: string | null
  aplicaciones: { tipo_doc: TipoDocCobro; documento_id: string; importe: number }[]
}

export interface CobroRegistrado {
  id: string
  numero: string
  documento_id: string
  importe: number
}

export type TipoReverso = 'reembolso' | 'abono_cuenta'

/** Fila de v_devolucion (+ `usuario_nombre`, ⚙ DT-27). */
export interface Devolucion {
  id: string
  numero: string
  regional_id: string
  fecha: string
  nota_venta_id: string
  nota_numero: string
  cliente_id: string
  cliente_nombre: string
  tipo_reverso: TipoReverso
  motivo: string
  importe: number
  nc_contable_numero: string | null
  usuario_nombre: string
  created_at: string
}

/** `rpc('max_devolvible')`: lo que se puede devolver de una nota y su situación. */
export interface MaxDevolvible {
  items: { producto_id: string; producto: string; vendido: number; devuelto: number; maximo: number; precio_aplicado: number }[]
  dia_cerrado: boolean
  saldo: number
  /** Cobrado − reembolsos previos: tope del reembolso en una nota a crédito. */
  cobrado_neto: number
}

export interface NuevaDevolucion {
  nota_id: string
  tipo_reverso: TipoReverso
  motivo: string
  items: { producto_id: string; cantidad: number }[]
}

export interface DevolucionRegistrada {
  id: string
  numero: string
  importe: number
}

export interface FiltrosDevoluciones {
  desde: string
  hasta: string
  tipo: TipoReverso | ''
}

/** `rpc('ingresos_vendedores')` (Reglas §7.2); `notas` solo con `p_detalle` (⚙ DT-27). */
export interface IngresoVendedor {
  vendedor_id: string
  vendedor: string
  notas: number
  ventas_contado: number
  ventas_credito: number
  cobranzas: number
  reembolsos: number
  ingreso: number
  detalle?: { id: string; numero: string; fecha: string; cliente: string; condicion: string; total: number; estado: 'emitida' | 'anulada' }[]
}

/** Un documento de `cargar_cartera_inicial` (⚠ SUP-24). */
export interface DocumentoCartera {
  cliente_id: string
  numero_documento: string
  fecha_documento: string
  fecha_vencimiento: string | null
  importe: number
  observaciones: string | null
}
