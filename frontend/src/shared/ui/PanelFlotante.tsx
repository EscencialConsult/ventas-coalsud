import { useEffect, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { cn } from './cn'
import type { useAnclaje } from './useAnclaje'

interface Props {
  anclaje: ReturnType<typeof useAnclaje<HTMLButtonElement, HTMLDivElement>>
  /** Nombre accesible del panel. */
  etiqueta: string
  className?: string
  children: ReactNode
}

// Panel con controles adentro (calendario): al abrir, el foco entra al panel;
// Esc lo cierra y devuelve el foco al botón; si el foco sale, se cierra.
export function PanelFlotante({ anclaje, etiqueta, className, children }: Props) {
  const { panel, disparador, abierto, cerrar, estilo, clases, animacion } = anclaje

  useEffect(() => {
    if (!abierto) return
    const el = panel.current
    const destino = el?.querySelector<HTMLElement>('[tabindex="0"]') ?? el?.querySelector<HTMLElement>('button:not(:disabled)')
    destino?.focus()
  }, [abierto, panel])

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    // Que no cierre también el modal que lo contiene.
    e.stopPropagation()
    cerrar()
    disparador.current?.focus()
  }

  const alPerderFoco = (e: FocusEvent<HTMLDivElement>) => {
    const destino = e.relatedTarget as Node | null
    if (destino && !panel.current?.contains(destino) && !disparador.current?.contains(destino)) cerrar()
  }

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <m.div
          ref={panel}
          role="dialog"
          aria-label={etiqueta}
          {...animacion}
          style={estilo}
          onKeyDown={alTeclear}
          onBlur={alPerderFoco}
          className={cn(clases, 'max-w-[calc(100vw-16px)] rounded-card border border-borde bg-white p-3 shadow-elevado', className)}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
