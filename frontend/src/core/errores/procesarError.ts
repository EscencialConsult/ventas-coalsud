import type { ErrorNegocio } from './ErrorNegocio'
import { reportarIncidente } from './incidentes'
import { mapearError } from './mapearError'

/**
 * Para los catch de la UI: traduce el error y, si es inesperado, lo reporta
 * al manejador global (detalle técnico). Devuelve el ErrorNegocio para que la
 * pantalla muestre su mensaje en su toast, alerta o campo.
 */
export function procesarError(error: unknown): ErrorNegocio {
  const e = mapearError(error)
  if (e.esInesperado) reportarIncidente(e)
  return e
}
