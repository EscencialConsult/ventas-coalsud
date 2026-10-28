import { esCodigoContrato } from './codigos'
import { ErrorNegocio } from './ErrorNegocio'

export const MENSAJE_DESCONOCIDO =
  'No se pudo completar la operación. Intente de nuevo; si persiste, avise al administrador.'

type ErrorPlano = {
  code?: unknown
  hint?: unknown
  message?: unknown
  details?: unknown
  name?: unknown
  status?: unknown
}

function parsearDetalle(details: unknown): Record<string, unknown> | undefined {
  if (details && typeof details === 'object') return details as Record<string, unknown>
  if (typeof details !== 'string' || !details) return undefined
  try {
    const valor: unknown = JSON.parse(details)
    return valor && typeof valor === 'object' ? (valor as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

// Traduce cualquier error (PostgrestError, AuthError, FunctionsHttpError, red)
// a ErrorNegocio según el Contrato de API §2.
export function mapearError(error: unknown): ErrorNegocio {
  if (error instanceof ErrorNegocio) return error

  const e = (error && typeof error === 'object' ? error : {}) as ErrorPlano
  const mensaje = typeof e.message === 'string' && e.message ? e.message : MENSAJE_DESCONOCIDO
  const detalle = parsearDetalle(e.details)

  // Regla de negocio: P0001 con el código en hint.
  if (esCodigoContrato(e.hint)) return new ErrorNegocio(e.hint, mensaje, detalle)

  switch (e.code) {
    case '23505':
      return new ErrorNegocio('DUPLICADO', 'Ya existe un registro con esos datos.', detalle)
    case '23514':
      return new ErrorNegocio('VALIDACION', 'Algún dato no es válido.', detalle)
    case '42501':
      return new ErrorNegocio('NO_AUTORIZADO', 'No tiene permiso para esta acción.')
    case 'PGRST301':
      return new ErrorNegocio('SESION_VENCIDA', 'Su sesión expiró. Ingrese nuevamente.')
  }

  if (e.name === 'AuthApiError' && (e.status === 400 || e.code === 'invalid_credentials')) {
    return new ErrorNegocio('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.')
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new ErrorNegocio('RED', 'No hay conexión con el servidor. Revise su internet e intente de nuevo.', undefined, error)
  }

  // El original viaja en `causa` para el detalle técnico del manejador global (core/errores/incidentes).
  return new ErrorNegocio('DESCONOCIDO', MENSAJE_DESCONOCIDO, undefined, error)
}
