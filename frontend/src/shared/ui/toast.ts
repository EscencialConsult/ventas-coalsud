// Store mínimo de avisos (sin librería). El Toaster se suscribe; cualquier
// módulo puede emitir con toast.exito / toast.error / toast.info.

export type TipoToast = 'exito' | 'error' | 'info'

export interface Toast {
  id: number
  tipo: TipoToast
  mensaje: string
  accion?: { etiqueta: string; alHacer: () => void }
}

type Oyente = (toasts: Toast[]) => void

const DURACION: Record<TipoToast, number> = { exito: 4000, info: 4000, error: 8000 }
// El mismo mensaje dentro de esta ventana no se repite (p. ej. dos queries que
// fallan por la misma razón, o el doble efecto de StrictMode).
const VENTANA_DUPLICADO_MS = 1500

let toasts: Toast[] = []
let siguienteId = 1
const oyentes = new Set<Oyente>()
const recientes = new Map<string, number>()

function emitir() {
  oyentes.forEach((o) => o(toasts))
}

function cerrar(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emitir()
}

function mostrar(tipo: TipoToast, mensaje: string, accion?: Toast['accion']) {
  const ahora = Date.now()
  const clave = `${tipo}:${mensaje}`
  if (ahora - (recientes.get(clave) ?? 0) < VENTANA_DUPLICADO_MS) return
  recientes.set(clave, ahora)

  const id = siguienteId++
  toasts = [...toasts, { id, tipo, mensaje, accion }]
  emitir()
  setTimeout(() => cerrar(id), DURACION[tipo])
}

export const toast = {
  exito: (mensaje: string, accion?: Toast['accion']) => mostrar('exito', mensaje, accion),
  error: (mensaje: string, accion?: Toast['accion']) => mostrar('error', mensaje, accion),
  info: (mensaje: string, accion?: Toast['accion']) => mostrar('info', mensaje, accion),
  cerrar,
  suscribir(oyente: Oyente): () => void {
    oyentes.add(oyente)
    oyente(toasts)
    return () => {
      oyentes.delete(oyente)
    }
  },
}
