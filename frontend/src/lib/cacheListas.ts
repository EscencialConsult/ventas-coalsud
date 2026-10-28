import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { Pagina } from '@/core/models/maestros'

// Actualizar la caché tras una mutación sin recargar todo (Contrato §9, regla 14):
// se escribe la fila en las listas ya cargadas y lo demás queda como está.

type ConId = { id: string }
type Lista<T> = T[] | Pagina<T>

const esPagina = <T,>(datos: unknown): datos is Pagina<T> => typeof datos === 'object' && datos !== null && Array.isArray((datos as Pagina<T>).filas)

// Solo toca listas (arreglos o páginas); cualquier otro dato bajo el prefijo queda igual.
function reemplazar<T extends ConId>(datos: Lista<T> | undefined, fila: T): Lista<T> | undefined {
  if (Array.isArray(datos)) return datos.map((f) => (f.id === fila.id ? fila : f))
  if (esPagina<T>(datos)) return { ...datos, filas: datos.filas.map((f) => (f.id === fila.id ? fila : f)) }
  return datos
}

/** Edición: reemplaza la fila en todas las listas cacheadas bajo `prefijo`. */
export function reemplazarFila<T extends ConId>(qc: QueryClient, prefijo: QueryKey, fila: T) {
  qc.setQueriesData<Lista<T>>({ queryKey: prefijo }, (datos) => reemplazar(datos, fila))
}

/**
 * Alta: la fila aparece arriba en la lista visible (`clave`) y las demás
 * listas del prefijo quedan marcadas como viejas, sin pedirlas ahora: se
 * vuelven a pedir recién cuando se abren.
 */
export function agregarFila<T extends ConId>(qc: QueryClient, prefijo: QueryKey, clave: QueryKey, fila: T) {
  qc.setQueryData<Lista<T>>(clave, (datos) => {
    if (Array.isArray(datos)) return [fila, ...datos]
    if (esPagina<T>(datos)) return { filas: [fila, ...datos.filas], total: datos.total + 1 }
    return datos
  })
  void qc.invalidateQueries({ queryKey: prefijo, refetchType: 'none', predicate: (q) => JSON.stringify(q.queryKey) !== JSON.stringify(clave) })
}

/** Cambio optimista de una fila (toggles): devuelve cómo deshacerlo si la base lo rechaza. */
export function cambiarFilaOptimista<T extends ConId>(qc: QueryClient, prefijo: QueryKey, id: string, cambio: Partial<T>): () => void {
  const previos = qc.getQueriesData<Lista<T>>({ queryKey: prefijo })
  qc.setQueriesData<Lista<T>>({ queryKey: prefijo }, (datos) => {
    const aplicar = (f: T) => (f.id === id ? { ...f, ...cambio } : f)
    if (Array.isArray(datos)) return datos.map(aplicar)
    if (esPagina<T>(datos)) return { ...datos, filas: datos.filas.map(aplicar) }
    return datos
  })
  return () => previos.forEach(([clave, datos]) => qc.setQueryData(clave, datos))
}
