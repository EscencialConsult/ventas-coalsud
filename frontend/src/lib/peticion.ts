/** Opciones que todo método de servicio acepta: TanStack Query pasa su `signal`. */
export interface OpcionesPeticion {
  signal?: AbortSignal
}

const enCurso = new Map<string, Promise<unknown>>()

/**
 * Comparte la petición en curso con la misma clave (doble montaje de
 * StrictMode, remontajes rápidos). No cachea: al terminar, la clave se libera.
 * Para lo que va por TanStack Query no hace falta (ya deduplica por queryKey).
 */
export function compartirPeticion<T>(clave: string, ejecutar: () => Promise<T>): Promise<T> {
  const existente = enCurso.get(clave)
  if (existente) return existente as Promise<T>
  const promesa = ejecutar().finally(() => enCurso.delete(clave))
  enCurso.set(clave, promesa)
  return promesa
}
