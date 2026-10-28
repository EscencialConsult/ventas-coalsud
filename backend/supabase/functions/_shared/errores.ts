import { cabecerasCors } from './cors.ts'

/** Error con status HTTP y código del contrato; se responde como { error: { codigo, mensaje } } (Contrato §8). */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

const STATUS_POR_CODIGO: Record<string, number> = {
  VALIDACION: 422,
  DUPLICADO: 409,
  ULTIMO_NACIONAL: 409,
  NO_ENCONTRADO: 404,
  SOLO_NACIONAL: 403,
  NO_AUTORIZADO: 403,
}

const MENSAJE_DESCONOCIDO = 'No se pudo completar la operación.'

/** Error de la base: las reglas de negocio llegan como P0001 con el código en hint (Contrato §2). */
export function desdeBase(error: { code?: string; hint?: string | null; message: string }): ErrorApi {
  if (error.code === 'P0001' && error.hint) return new ErrorApi(STATUS_POR_CODIGO[error.hint] ?? 400, error.hint, error.message)
  return new ErrorApi(500, 'DESCONOCIDO', MENSAJE_DESCONOCIDO)
}

export function responder(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...cabecerasCors, 'Content-Type': 'application/json' } })
}

export function responderError(e: unknown): Response {
  if (e instanceof ErrorApi) return responder({ error: { codigo: e.codigo, mensaje: e.message } }, e.status)
  // Inesperado: al log técnico de Supabase (Seguridad RLS §8); al cliente, un mensaje genérico.
  console.error(e)
  return responder({ error: { codigo: 'DESCONOCIDO', mensaje: MENSAJE_DESCONOCIDO } }, 500)
}
