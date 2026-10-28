import { useCallback, useSyncExternalStore } from 'react'

/** true mientras la media query se cumple (p. ej. '(min-width: 1024px)'). */
export function useMediaQuery(consulta: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const mql = window.matchMedia?.(consulta)
      mql?.addEventListener('change', avisar)
      return () => mql?.removeEventListener('change', avisar)
    },
    [consulta],
  )
  return useSyncExternalStore(suscribir, () => window.matchMedia?.(consulta).matches ?? false)
}
