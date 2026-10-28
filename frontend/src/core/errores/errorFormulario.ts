import { toast } from '@/shared/ui/toast'
import { mapearError } from './mapearError'

/**
 * Error al guardar un formulario (06-pantallas/00 §3): si la base señala un
 * campo (`detalle.campo`, p. ej. VALIDACION o DUPLICADO), se marca ese campo;
 * si no, toast. Los inesperados ya los reporta el manejador global.
 */
export function aplicarErrorFormulario<C extends string>(error: unknown, campos: readonly C[], marcarError: (campo: C, mensaje: string) => void): void {
  const e = mapearError(error)
  if (e.esInesperado) return
  const campo = e.detalle?.campo
  if (typeof campo === 'string' && (campos as readonly string[]).includes(campo)) marcarError(campo as C, e.message)
  else toast.error(e.message)
}

/** Toggle rechazado (optimista con rollback, regla 15): aviso al usuario salvo que sea inesperado. */
export function avisarErrorToggle(error: unknown): void {
  const e = mapearError(error)
  if (!e.esInesperado) toast.error(e.message)
}
