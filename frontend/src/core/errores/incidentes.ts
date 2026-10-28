import { toast } from '@/shared/ui/toast'
import { ErrorNegocio } from './ErrorNegocio'

// Manejador ÚNICO de errores inesperados (render, efectos, clics, timers,
// promesas sin catch, respuestas que no son reglas de negocio). Los errores
// esperados (validación, reglas del contrato) NO pasan por acá: siguen con su
// toast o estado de sección.

export interface Incidente {
  /** Código para que el usuario lo informe (no hay requestId de PostgREST). */
  codigo: string
  fecha: string
  usuario: string
  pantalla: string
  nombre: string
  mensaje: string
  stack?: string
  componentes?: string
}

type Oyente = (incidentes: Incidente[]) => void

let usuarioActual = 'sin sesión'
let incidentes: Incidente[] = []
const oyentes = new Set<Oyente>()

/** Lo llama AuthProvider cada vez que cambia la sesión. */
export function fijarUsuarioIncidentes(descripcion: string | null) {
  usuarioActual = descripcion ?? 'sin sesión'
}

function codigoIncidente(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function desenvolver(error: unknown): unknown {
  return error instanceof ErrorNegocio && error.causa !== undefined ? error.causa : error
}

/** Cancelaciones y ruido del navegador o de extensiones: no se reportan. */
export function esRuido(error: unknown, origen?: string): boolean {
  const e = desenvolver(error)
  if (e instanceof DOMException && e.name === 'AbortError') return true
  if (e && typeof e === 'object' && 'name' in e && (e.name === 'AbortError' || e.name === 'CancelledError')) return true
  const texto = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e)
  if (/ResizeObserver loop|^Script error\.?$/i.test(texto)) return true
  return /(chrome|moz|safari)-extension:\/\//.test(`${texto}\n${origen ?? ''}`)
}

export function crearIncidente(error: unknown, componentes?: string): Incidente {
  const e = desenvolver(error)
  const comoError = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e))
  return {
    codigo: codigoIncidente(),
    fecha: new Date().toISOString(),
    usuario: usuarioActual,
    pantalla: typeof window === 'undefined' ? '' : window.location.pathname + window.location.search,
    nombre: comoError.name,
    mensaje: comoError.message,
    stack: comoError.stack,
    componentes,
  }
}

/** Texto que el usuario copia y envía al administrador. */
export function textoIncidente(i: Incidente): string {
  return [
    `Código: ${i.codigo}`,
    `Fecha: ${i.fecha}`,
    `Usuario: ${i.usuario}`,
    `Pantalla: ${i.pantalla}`,
    `Error: ${i.nombre}: ${i.mensaje}`,
    i.stack && `Stack:\n${i.stack}`,
    i.componentes && `Componentes:${i.componentes}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function emitir() {
  oyentes.forEach((o) => o(incidentes))
}

/** Reporta un error inesperado que no tumba la pantalla (aviso flotante). */
export function reportarIncidente(error: unknown, origen?: string): void {
  if (esRuido(error, origen)) return
  // Una regla de negocio que llegó sin catch sigue siendo un error esperado: va a su toast.
  if (error instanceof ErrorNegocio && !error.esInesperado) {
    toast.error(error.message)
    return
  }
  incidentes = [...incidentes, crearIncidente(error)].slice(-5)
  emitir()
}

export function descartarIncidente(codigo: string) {
  incidentes = incidentes.filter((i) => i.codigo !== codigo)
  emitir()
}

export function suscribirIncidentes(oyente: Oyente): () => void {
  oyentes.add(oyente)
  oyente(incidentes)
  return () => {
    oyentes.delete(oyente)
  }
}

/** Listeners globales: errores sueltos y promesas sin catch. Se instala una vez en main.tsx. */
export function instalarManejadoresGlobales(): () => void {
  const alError = (evento: ErrorEvent) => reportarIncidente(evento.error ?? evento.message, evento.filename)
  const alRechazo = (evento: PromiseRejectionEvent) => reportarIncidente(evento.reason)
  window.addEventListener('error', alError)
  window.addEventListener('unhandledrejection', alRechazo)
  return () => {
    window.removeEventListener('error', alError)
    window.removeEventListener('unhandledrejection', alRechazo)
  }
}
