// Inventario (Esquema BD §1.10–1.13, Contrato §4 y §5.1, ⚙ DT-25).

export type TipoDocumento = 'ingreso' | 'salida' | 'retorno' | 'traspaso' | 'ajuste'

export type TipoMovimiento = 'ingreso' | 'salida' | 'retorno' | 'traspaso_salida' | 'traspaso_entrada' | 'venta' | 'anulacion' | 'devolucion' | 'ajuste'

/** Fila de `v_documento_inventario` (⚙ DT-25): el documento con nombres y cantidad de ítems. */
export interface DocumentoInventario {
  id: string
  numero: string
  tipo: TipoDocumento
  regional_id: string
  almacen_id: string
  almacen_nombre: string
  almacen_destino_id: string | null
  almacen_destino_nombre: string | null
  /** Regional del almacén destino (traspasos): la regional destino también ve el documento. */
  regional_destino_id: string | null
  vendedor_id: string | null
  vendedor_nombre: string | null
  fecha: string
  referencia: string | null
  motivo: string | null
  items: number
  usuario_nombre: string
  created_at: string
}

export interface ItemDocumento {
  producto_id: string
  producto_nombre: string
  linea_nombre: string
  cantidad: number
}

export interface DocumentoDetalle extends DocumentoInventario {
  detalle: ItemDocumento[]
}

/** Fila de `v_movimiento`. */
export interface Movimiento {
  id: string
  fecha: string
  tipo: TipoMovimiento
  regional_id: string
  almacen_id: string
  almacen_nombre: string
  /** Nulo = stock físico del almacén. */
  vendedor_id: string | null
  vendedor_nombre: string | null
  producto_id: string
  producto_nombre: string
  cantidad: number
  documento_id: string | null
  nota_venta_id: string | null
  devolucion_id: string | null
  /** N° del documento, la nota o la devolución que lo originó. */
  documento_numero: string
  usuario_nombre: string
  created_at: string
}

/** Fila de `rpc('kardex')` (con el id del movimiento, ⚙ DT-25). */
export interface FilaKardex {
  id: string
  fecha: string
  tipo: TipoMovimiento
  documento: string
  cantidad: number
  saldo_anterior: number
  saldo_nuevo: number
  usuario: string
}

/** Fila de `rpc('saldo_vendedores')` (Reglas §7.1). */
export interface SaldoVendedor {
  vendedor_id: string
  vendedor: string
  producto_id: string
  producto: string
  saldo_inicial: number
  entregado: number
  vendido: number
  retornado: number
  saldo_final: number
  valorizado: number
}

export interface FiltrosMovimientos {
  desde: string
  hasta: string
  tipo: TipoMovimiento | ''
  productoId: string
  /** N° de documento (contiene). */
  documento: string
}

export interface FiltrosDocumentos {
  tipo: TipoDocumento | ''
  desde: string
  hasta: string
}

/** Lo que viaja a `registrar_*`. Las cantidades del ajuste llevan signo. */
export interface NuevoDocumento {
  tipo: TipoDocumento
  almacen_id: string
  almacen_destino_id: string | null
  vendedor_id: string | null
  fecha: string
  referencia: string | null
  motivo: string | null
  items: { producto_id: string; cantidad: number }[]
}

export interface DocumentoRegistrado {
  id: string
  numero: string
}
