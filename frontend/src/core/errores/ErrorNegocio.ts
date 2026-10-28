import type { CodigoError } from './codigos'

// Único tipo de error que ven los hooks y las pantallas, venga de Supabase,
// de la Edge Function o de los fixtures. Se programa por `codigo`, nunca por texto.
export class ErrorNegocio extends Error {
  readonly codigo: CodigoError
  readonly detalle?: Record<string, unknown>
  /** Error original, para el detalle técnico de los errores inesperados. */
  readonly causa?: unknown

  constructor(codigo: CodigoError, mensaje: string, detalle?: Record<string, unknown>, causa?: unknown) {
    super(mensaje)
    this.name = 'ErrorNegocio'
    this.codigo = codigo
    this.detalle = detalle
    this.causa = causa
  }

  /** Inesperado = no es una regla de negocio ni una falla conocida: va al manejador global. */
  get esInesperado(): boolean {
    return this.codigo === 'DESCONOCIDO'
  }
}
