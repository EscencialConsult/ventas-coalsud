import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from './cn'

const MARGEN = 8
const SEPARACION = 4

interface Posicion {
  x: number
  y: number
  ancho: number
  alto: number
  arriba: boolean
}

/**
 * Panel flotante anclado a un control (lista de un select, calendario de un
 * campo de fecha). Va en un portal con posición fija calculada (regla 37): no
 * lo recorta un contenedor con scroll, se abre hacia arriba si abajo no entra
 * y no se sale por los costados. Cierra con clic afuera o al redimensionar.
 */
export function useAnclaje<D extends HTMLElement, P extends HTMLElement>(altoMax = 280) {
  const disparador = useRef<D>(null)
  const panel = useRef<P>(null)
  const [pos, setPos] = useState<Posicion | null>(null)
  const abierto = pos !== null

  const cerrar = useCallback(() => setPos(null), [])

  const abrir = useCallback(() => {
    const r = disparador.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left, y: r.bottom + SEPARACION, ancho: r.width, alto: altoMax, arriba: false })
  }, [altoMax])

  // Con el panel ya dibujado se conoce su tamaño real.
  const ubicar = useCallback(() => {
    const boton = disparador.current
    const el = panel.current
    if (!boton || !el) return
    const r = boton.getBoundingClientRect()
    const abajo = window.innerHeight - r.bottom - MARGEN
    const encima = r.top - MARGEN
    const natural = Math.min(el.scrollHeight + el.offsetHeight - el.clientHeight, altoMax)
    const arriba = natural > abajo && encima > abajo
    const alto = Math.min(natural, arriba ? encima : abajo)
    const ancho = Math.max(el.offsetWidth, r.width)
    setPos({
      x: Math.max(MARGEN, Math.min(r.left, window.innerWidth - ancho - MARGEN)),
      y: arriba ? r.top - SEPARACION - alto : r.bottom + SEPARACION,
      ancho: r.width,
      alto,
      arriba,
    })
  }, [altoMax])

  useLayoutEffect(() => {
    if (abierto) ubicar()
  }, [abierto, ubicar])

  useEffect(() => {
    if (!abierto) return
    const alClic = (e: MouseEvent) => {
      const destino = e.target as Node
      if (!disparador.current?.contains(destino) && !panel.current?.contains(destino)) cerrar()
    }
    // El scroll del propio panel no lo mueve; el de la página o un modal, sí.
    const alDesplazar = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) ubicar()
    }
    document.addEventListener('mousedown', alClic)
    window.addEventListener('scroll', alDesplazar, true)
    window.addEventListener('resize', cerrar)
    return () => {
      document.removeEventListener('mousedown', alClic)
      window.removeEventListener('scroll', alDesplazar, true)
      window.removeEventListener('resize', cerrar)
    }
  }, [abierto, cerrar, ubicar])

  /** Posición como variables CSS (única excepción a "sin style inline", regla 36). */
  const estilo = pos ? ({ '--x': `${pos.x}px`, '--y': `${pos.y}px`, '--ancho': `${pos.ancho}px`, '--alto': `${pos.alto}px` } as Record<string, string>) : undefined
  const clases = cn('fixed top-(--y) left-(--x) z-[300] min-w-(--ancho)', pos?.arriba ? 'origin-bottom' : 'origin-top')
  /** Entrada desde el lado del control. */
  const animacion = { initial: { opacity: 0, y: pos?.arriba ? 4 : -4, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.98 }, transition: { duration: 0.12, ease: 'easeOut' as const } }

  return { disparador, panel, abierto, abrir, cerrar, estilo, clases, animacion }
}
