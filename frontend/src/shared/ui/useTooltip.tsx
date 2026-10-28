import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { cn } from './cn'

export type LadoTooltip = 'arriba' | 'abajo' | 'derecha'

const ANCLA: Record<LadoTooltip, string> = {
  arriba: '-translate-x-1/2 -translate-y-full',
  abajo: '-translate-x-1/2',
  derecha: '-translate-y-1/2',
}

interface Posicion {
  x: number
  y: number
}

function posicionDe(el: HTMLElement, lado: LadoTooltip): Posicion {
  const r = el.getBoundingClientRect()
  if (lado === 'derecha') return { x: r.right + 10, y: r.top + r.height / 2 }
  if (lado === 'abajo') return { x: r.left + r.width / 2, y: r.bottom + 6 }
  return { x: r.left + r.width / 2, y: r.top - 6 }
}

function conFocoVisible(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

/**
 * Tooltip propio (en vez del `title` nativo). Es solo visual: el disparador
 * siempre tiene su nombre accesible (aria-label o texto). Va en un portal con
 * posición fija para que no lo recorte un contenedor con scroll (sidebar).
 * La posición se calcula en tiempo de ejecución: única excepción a "sin style
 * inline" junto con las animaciones de motion (04-Sistema_de_Diseno §8).
 */
export function useTooltip<T extends HTMLElement>(texto: string, { lado = 'arriba', desactivado = false }: { lado?: LadoTooltip; desactivado?: boolean } = {}) {
  const ref = useRef<T>(null)
  const [pos, setPos] = useState<Posicion | null>(null)

  const ocultar = useCallback(() => setPos(null), [])
  const mostrar = useCallback(() => {
    if (desactivado || !ref.current) return
    setPos(posicionDe(ref.current, lado))
  }, [desactivado, lado])

  // Al hacer scroll o redimensionar, la posición calculada deja de valer.
  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', ocultar, true)
    window.addEventListener('resize', ocultar)
    return () => {
      window.removeEventListener('scroll', ocultar, true)
      window.removeEventListener('resize', ocultar)
    }
  }, [pos, ocultar])

  const propsDisparador = {
    ref,
    onPointerEnter: (e: PointerEvent<T>) => {
      if (e.pointerType === 'mouse') mostrar()
    },
    onPointerLeave: ocultar,
    onPointerDown: ocultar,
    onFocus: (e: FocusEvent<T>) => {
      if (conFocoVisible(e.currentTarget)) mostrar()
    },
    onBlur: ocultar,
  }

  const tooltip: ReactNode = desactivado
    ? null
    : createPortal(
      <AnimatePresence>
        {pos && (
          <span aria-hidden className={cn('pointer-events-none fixed top-(--y) left-(--x) z-[400]', ANCLA[lado])} style={{ '--x': `${pos.x}px`, '--y': `${pos.y}px` } as Record<string, string>}>
            <m.span
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="block rounded-control bg-texto px-2 py-1 text-mini font-semibold whitespace-nowrap text-white shadow-elevado"
            >
              {texto}
            </m.span>
          </span>
        )}
      </AnimatePresence>,
      document.body,
    )

  return { propsDisparador, tooltip }
}
