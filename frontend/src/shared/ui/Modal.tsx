import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { X } from 'lucide-react'
import { BotonIcono } from './BotonIcono'
import { cn } from './cn'

const ANCHO = { md: 'sm:max-w-[520px]', lg: 'sm:max-w-[720px]', xl: 'sm:max-w-[960px]' }

interface Props {
  abierto: boolean
  titulo: ReactNode
  alCerrar: () => void
  tam?: keyof typeof ANCHO
  pie?: ReactNode
  /** Mientras se guarda, no se cierra con Esc ni con clic afuera. */
  bloqueado?: boolean
  children: ReactNode
}

// En móvil sube desde abajo (hoja inferior); desde sm, centrado.
export function Modal({ abierto, titulo, alCerrar, tam = 'md', pie, bloqueado = false, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const alCerrarRef = useRef(alCerrar)
  const bloqueadoRef = useRef(bloqueado)
  useEffect(() => {
    alCerrarRef.current = alCerrar
    bloqueadoRef.current = bloqueado
  }, [alCerrar, bloqueado])

  // Solo depende de `abierto`: bloquear/desbloquear (p. ej. al abrir una
  // confirmación encima) no debe mover el foco.
  useEffect(() => {
    if (!abierto) return
    const foco = document.activeElement as HTMLElement | null
    // Foco al primer control del modal (o al panel).
    const primero = panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-cerrar])')
    const destino = primero ?? panel.current
    destino?.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloqueadoRef.current) alCerrarRef.current()
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      foco?.focus()
    }
  }, [abierto])

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <m.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !bloqueado) alCerrar()
          }}
        >
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={cn('scroll-fino flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-card border border-borde bg-white shadow-elevado outline-none sm:rounded-card', ANCHO[tam])}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-borde px-5 py-3.5">
              <h2 id={idTitulo} className="text-subtitulo font-semibold">{titulo}</h2>
              <BotonIcono etiqueta="Cerrar" data-cerrar disabled={bloqueado} onClick={alCerrar} sinTooltip>
                <X size={17} />
              </BotonIcono>
            </div>
            <div className="scroll-fino flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {pie && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-borde bg-fondo-2 px-5 py-3">{pie}</div>}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
