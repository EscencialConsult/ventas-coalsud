export type EstadoNota = 'emitida' | 'anulada'
export type CondicionTipo = 'contado' | 'credito'
export type Canal = 'supermercado' | 'ruta' | 'institucional'
export type OrigenStock = 'almacen' | 'vendedor'

/** Fila de v_nota_venta (Esquema §2) — solo las columnas que usa el frontend por ahora. */
export interface NotaVentaResumen {
  id: string
  numero: string
  regional_id: string
  regional_codigo: string
  fecha: string
  cliente_id: string
  cliente_nombre: string
  vendedor_id: string | null
  vendedor_nombre: string
  condicion_tipo: CondicionTipo
  condicion_nombre: string
  numero_factura: string | null
  total: number
  saldo: number
  estado: EstadoNota
  pendiente_factura: boolean
}

/** Fila completa de v_nota_venta (Esquema §2): historial, detalle e impresión. */
export interface NotaVenta extends NotaVentaResumen {
  cliente_nit: string | null
  canal: Canal
  condicion_pago_id: string
  dias_credito: number
  fecha_vencimiento: string
  descuento_pct: number
  origen_stock: OrigenStock
  factura_pdf_path: string | null
  motivo_anulacion: string | null
  anulada_en: string | null
  observaciones: string | null
  bruto: number
  descuento_bs: number
  cobrado: number
  abonado: number
  tiene_devolucion: boolean
  /** ⚙ DT-26: el día de la nota ya se cerró (no se anula: se devuelve). */
  dia_cerrado: boolean
  usuario_nombre: string
  created_at: string
}

/** nota_venta_item (+ producto, línea). */
export interface ItemNota {
  producto_id: string
  producto_nombre: string
  linea_nombre: string
  cantidad: number
  precio_base: number
  precio_aplicado: number
  subtotal: number
}

export interface NotaDetalle extends NotaVenta {
  items: ItemNota[]
}

export interface FiltrosNotas {
  desde: string
  hasta: string
  estado: EstadoNota | ''
  vendedorId: string
  condicion: CondicionTipo | ''
  sinFactura: boolean
  /** N° de nota, factura o cliente (contiene). */
  q: string
}

/** Lo que viaja a `emitir_nota_venta`. */
export interface NuevaNota {
  regional_id: string
  fecha: string
  cliente_id: string
  vendedor_id: string
  canal: Canal
  condicion_pago_id: string
  descuento_pct: number
  origen_stock: OrigenStock
  numero_factura: string | null
  observaciones: string | null
  items: { producto_id: string; cantidad: number; precio_aplicado: number }[]
}

export interface NotaEmitida {
  id: string
  numero: string
  bruto: number
  descuento_bs: number
  total: number
}

export interface FacturaRegistrada {
  id: string
  numero_factura: string
  factura_pdf_path: string | null
  advertencia_duplicado: boolean
}

export interface NotaAnulada {
  id: string
  estado: EstadoNota
  aviso_factura: string | null
}

/** Una hoja de `rpc('hoja_carga')`: lo que carga un vendedor en el día. */
export interface HojaCarga {
  vendedor_id: string
  vendedor: string
  productos: { producto_id: string; producto: string; linea: string; cantidad: number; bs: number }[]
  notas: { id: string; numero: string; cliente: string; zona: string | null; condicion: string; total: number }[]
  totales: { unidades: number; bruto: number; descuento: number; neto: number }
}
