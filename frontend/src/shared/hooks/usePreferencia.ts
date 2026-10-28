import { useCallback, useState } from 'react'

const PREFIJO = 'coalsud:'

function leer<T>(clave: string, inicial: T): T {
  try {
    const crudo = localStorage.getItem(PREFIJO + clave)
    return crudo === null ? inicial : (JSON.parse(crudo) as T)
  } catch {
    return inicial
  }
}

/**
 * Preferencia de interfaz del usuario en este navegador (p. ej. sidebar
 * compacto). Si el almacenamiento no está disponible, funciona solo en memoria.
 */
export function usePreferencia<T extends boolean | string | number>(clave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => leer(clave, inicial))

  const cambiar = useCallback(
    (nuevo: T) => {
      setValor(nuevo)
      try {
        localStorage.setItem(PREFIJO + clave, JSON.stringify(nuevo))
      } catch {
        // Sin almacenamiento (modo privado o bloqueado): queda en memoria.
      }
    },
    [clave],
  )

  return [valor, cambiar] as const
}
