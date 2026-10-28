import { useSyncExternalStore } from 'react'

function suscribir(avisar: () => void) {
  window.addEventListener('scroll', avisar, { passive: true })
  return () => window.removeEventListener('scroll', avisar)
}

/**
 * true cuando la página bajó más de `umbral` px (p. ej. para dar sombra al
 * topbar). Solo re-renderiza cuando cambia el booleano, no en cada scroll.
 */
export function useDesplazado(umbral = 4): boolean {
  return useSyncExternalStore(suscribir, () => window.scrollY > umbral)
}
