import { useEffect, useState } from 'react'

/** Valor que se actualiza recién cuando deja de cambiar por `ms` (búsquedas: 300 ms, regla 18). */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [demorado, setDemorado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return demorado
}
