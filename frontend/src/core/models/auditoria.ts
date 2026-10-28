// Auditoría (06-pantallas/12, Esquema BD: `auditoria`).

/** Las acciones que escribe la base (Seguridad RLS §8). */
export type AccionAuditoria =
  | 'emitir_nota'
  | 'cambio_precio'
  | 'descuento'
  | 'anular_nota'
  | 'registrar_factura'
  | 'registrar_cobranza'
  | 'anular_cobranza'
  | 'cargar_cartera_inicial'
  | 'registrar_devolucion'
  | 'registrar_nc_contable'
  | 'registrar_ingreso'
  | 'registrar_salida'
  | 'registrar_retorno'
  | 'registrar_traspaso'
  | 'registrar_ajuste'
  | 'cerrar_dia'
  | 'reabrir_dia'
  | 'crear'
  | 'editar'
  | 'desactivar'
  | 'reactivar'
  | 'cambio_precio_base'
  | 'crear_usuario'
  | 'editar_usuario'
  | 'desactivar_usuario'
  | 'reactivar_usuario'
  | 'resetear_password'

export type EntidadAuditoria =
  | 'nota_venta'
  | 'cobranza'
  | 'devolucion'
  | 'documento_inventario'
  | 'liquidacion'
  | 'cxc_saldo_inicial'
  | 'usuario'
  | 'cliente'
  | 'vendedor'
  | 'producto'
  | 'linea_comercial'
  | 'condicion_pago'
  | 'regional'
  | 'almacen'
  | 'presupuesto'

/** Fila de `auditoria` (+ nombres y `registro` legible, ⚙ DT-29). */
export interface RegistroAuditoria {
  /** bigint identity en la base. */
  id: number | string
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
