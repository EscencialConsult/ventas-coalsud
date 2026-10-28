import { useEffect, type RefObject } from 'react'

/**
 * Marca el elemento con `data-desplazando` mientras scrollea (directo en el DOM, sin re-render).
 * Sirve para apagar el hover durante el scroll: las filas que pasan bajo el cursor
 * obligan a repintar en cada cuadro y el scroll se traba.
 */
export function useDesplazandose(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let espera = 0
    const alDesplazar = () => {
      if (!espera) el.dataset.desplazando = ''
      window.clearTimeout(espera)
      espera = window.setTimeout(() => {
        delete el.dataset.desplazando
        espera = 0
      }, 150)
    }
    el.addEventListener('scroll', alDesplazar, { passive: true })
    return () => {
      el.removeEventListener('scroll', alDesplazar)
      window.clearTimeout(espera)
    }
  }, [ref])
}
