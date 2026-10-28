// Auditoría (06-pantallas/12, Esquema BD: `auditoria`).

export type AccionAuditoria =
  | 'emitir_nota'
  | 'cambio_precio'
  | 'descuento'
  | 'anular_nota'
  | 'registrar_factura'
  | 'registrar_cobranza'
  | 'anular_cobranza'
  | 'registrar_devolucion'
  | 'registrar_documento'
  | 'cerrar_dia'
  | 'reabrir_dia'
  | 'cargar_cartera'

export type EntidadAuditoria = 'nota_venta' | 'cobranza' | 'devolucion' | 'documento_inventario' | 'liquidacion' | 'cxc_saldo_inicial'

/** Fila de `auditoria` (+ nombres y `registro` legible, ⚙ DT-29). */
export interface RegistroAuditoria {
  id: string
  created_at: string
  usuario_nombre: string
  regional_id: string | null
  regional_codigo: string | null
  accion: AccionAuditoria
  entidad: EntidadAuditoria
  entidad_id: string
  registro: string
  datos: Record<string, unknown>
}

export interface FiltrosAuditoria {
  desde: string
  hasta: string
  usuario: string
  accion: AccionAuditoria | ''
  entidad: EntidadAuditoria | ''
}
