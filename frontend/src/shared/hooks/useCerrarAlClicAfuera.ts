import { useEffect, useRef } from 'react'

// Cierra un menú desplegable al hacer clic afuera o al apretar Escape.
export function useCerrarAlClicAfuera<T extends HTMLElement>(abierto: boolean, cerrar: () => void) {
  const ref = useRef<T>(null)
  const cerrarRef = useRef(cerrar)
  useEffect(() => {
    cerrarRef.current = cerrar
  }, [cerrar])

  useEffect(() => {
    if (!abierto) return
    const alClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrarRef.current()
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current()
    }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abierto])

  return ref
}
