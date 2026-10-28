// Catálogo del Contrato de API §2.2 (viaja en `hint`) + códigos propios del
// frontend para errores que no vienen de una regla de negocio.
export const CODIGOS_CONTRATO = [
  'NO_AUTORIZADO',
  'SOLO_NACIONAL',
  'USUARIO_INACTIVO',
  'VALIDACION',
  'NO_ENCONTRADO',
  'REGISTRO_INACTIVO',
  'FECHA_INVALIDA',
  'DIA_CERRADO',
  'DIA_ANTERIOR_ABIERTO',
  'FACTURA_PENDIENTE',
  'REAPERTURA_NO_PERMITIDA',
  'STOCK_INSUFICIENTE',
  'NOTA_ANULADA',
  'NOTA_NO_ANULABLE',
  'DEVOLUCION_DIA_ABIERTO',
  'DEVOLUCION_EXCEDE',
  'ABONO_NO_PERMITIDO',
  'REEMBOLSO_EXCEDE_COBRADO',
  'DOCUMENTO_CONTADO',
  'IMPORTE_EXCEDE_SALDO',
  'COBRANZA_NO_ANULABLE',
  'DUPLICADO',
  'ULTIMO_NACIONAL',
  'VENDEDOR_CON_SALDO',
  'INMUTABLE',
] as const

export const CODIGOS_FRONTEND = ['CREDENCIALES_INVALIDAS', 'SESION_VENCIDA', 'RED', 'DESCONOCIDO'] as const

export type CodigoContrato = (typeof CODIGOS_CONTRATO)[number]
export type CodigoError = CodigoContrato | (typeof CODIGOS_FRONTEND)[number]

export function esCodigoContrato(valor: unknown): valor is CodigoContrato {
  return typeof valor === 'string' && (CODIGOS_CONTRATO as readonly string[]).includes(valor)
}
