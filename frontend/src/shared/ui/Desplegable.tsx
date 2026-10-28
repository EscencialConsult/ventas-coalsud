import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useCerrarAlClicAfuera } from '@/shared/hooks/useCerrarAlClicAfuera'
import { cn } from './cn'

const ENFOCABLES = 'a[href], button:not(:disabled)'

export interface PropsDisparador {
  'aria-expanded': boolean
  'aria-controls': string
  'aria-haspopup': 'dialog'
  onClick: () => void
}

interface Props {
  /** Nombre accesible del panel. */
  etiqueta: string
  /** Botón que abre el panel: recibir y esparcir las props ARIA. */
  disparador: (props: PropsDisparador, abierto: boolean) => ReactNode
  children: (cerrar: () => void) => ReactNode
  alinear?: 'izq' | 'der'
  /**
   * disparador: el panel se alinea con el botón.
   * contenedor: con el ancestro posicionado más cercano (p. ej. la pista que
   * envuelve al botón), para que los bordes coincidan con los del bloque.
   */
  anclaje?: 'disparador' | 'contenedor'
  /** Ancho del panel (clases). */
  className?: string
}

// Panel flotante anclado a un botón (campana, menú de usuario, regional).
// Cierra con clic afuera, Esc (devuelve el foco al botón) o al salir con Tab;
// las flechas recorren los ítems.
export function Desplegable({ etiqueta, disparador, children, alinear = 'der', anclaje = 'disparador', className }: Props) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])
  const ref = useCerrarAlClicAfuera<HTMLDivElement>(abierto, cerrar)

  useEffect(() => {
    if (!abierto) return
    const el = panel.current
    const destino = el?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? el?.querySelector<HTMLElement>(ENFOCABLES)
    destino?.focus()
  }, [abierto])

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      cerrar()
      ref.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>(ENFOCABLES) ?? [])
    if (!items.length) return
    e.preventDefault()
    const actual = items.indexOf(document.activeElement as HTMLElement)
    const siguiente = e.key === 'ArrowDown' ? (actual + 1) % items.length : (actual - 1 + items.length) % items.length
    items[siguiente].focus()
  }

  // Solo cierra si el foco se fue a otro elemento fuera del desplegable.
  const alPerderFoco = (e: FocusEvent<HTMLDivElement>) => {
    const destino = e.relatedTarget as Node | null
    if (destino && !e.currentTarget.contains(destino)) cerrar()
  }

  return (
    <div ref={ref} className={anclaje === 'disparador' ? 'relative' : undefined} onBlur={alPerderFoco}>
      {disparador({ 'aria-expanded': abierto, 'aria-controls': id, 'aria-haspopup': 'dialog', onClick: () => setAbierto((a) => !a) }, abierto)}
      <AnimatePresence>
        {abierto && (
          <m.div
            ref={panel}
            id={id}
            role="dialog"
            aria-label={etiqueta}
            onKeyDown={alTeclear}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={cn(
              'absolute top-full z-[60] mt-2 max-w-[calc(100vw-24px)] rounded-card border border-borde bg-white p-1.5 text-cuerpo shadow-elevado',
              alinear === 'der' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              className,
            )}
          >
            {children(cerrar)}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface PropsItem {
  icono?: ReactNode
  /** Si se indica, el ítem es un enlace. */
  a?: string
  onClick?: () => void
  /** Opción elegida (selectores): se marca y recibe el foco al abrir. */
  seleccionado?: boolean
  peligro?: boolean
  children: ReactNode
}

// Ítem de un Desplegable: enlace o botón con el mismo aspecto.
export function ItemDesplegable({ icono, a, onClick, seleccionado, peligro = false, children }: PropsItem) {
  const clases = cn(
    'flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors outline-none hover:bg-fondo-3 focus-visible:bg-fondo-3 active:bg-superficie',
    peligro ? 'text-error hover:bg-error-fondo focus-visible:bg-error-fondo' : 'text-texto',
    seleccionado && 'bg-rojo-tenue font-semibold text-rojo hover:bg-rojo-tenue',
  )
  const contenido = (
    <>
      {icono && <span className="flex shrink-0 text-texto-3 [&>svg]:size-4">{icono}</span>}
      <span className="min-w-0 flex-1">{children}</span>
    </>
  )
  return a ? (
    <Link to={a} onClick={onClick} className={clases}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-pressed={seleccionado} className={clases}>
      {contenido}
    </button>
  )
}
