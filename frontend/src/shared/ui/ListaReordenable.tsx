import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import * as m from 'motion/react-m'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { BotonIcono } from './BotonIcono'
import { cn } from './cn'
import { RELIEVE, TEXTO_RELIEVE } from './neumorfismo'

interface Props<T> {
  items: T[]
  claveItem: (item: T) => string
  /** Nombre del ítem para los botones ("Subir COMRURAL"). */
  nombreItem: (item: T) => string
  /** Se llama al soltar (o con una flecha) con la lista en el nuevo orden. */
  alReordenar: (items: T[]) => void
  render: (item: T, posicion: number) => ReactNode
  /** Sin permiso de edición: lista fija, sin asa ni flechas. */
  soloLectura?: boolean
  etiqueta: string
}

function mover<T>(lista: T[], desde: number, hasta: number): T[] {
  const copia = [...lista]
  const [item] = copia.splice(desde, 1)
  copia.splice(hasta, 0, item)
  return copia
}

// Lista que se reordena arrastrando del asa (las demás filas se acomodan con
// una animación de layout) o con las flechas ↑↓, que sirven con teclado y en
// móvil. Mientras se arrastra, el orden es local; se confirma al soltar.
export function ListaReordenable<T>({ items, claveItem, nombreItem, alReordenar, render, soloLectura = false, etiqueta }: Props<T>) {
  const [arrastre, setArrastre] = useState<{ id: string; orden: T[] } | null>(null)
  const contenedor = useRef<HTMLUListElement>(null)
  const lista = arrastre?.orden ?? items

  const empezar = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastre({ id, orden: items })
  }

  // La fila arrastrada ocupa el lugar de la fila sobre la que está el puntero.
  const moverPuntero = (e: PointerEvent<HTMLButtonElement>) => {
    if (!arrastre || !contenedor.current) return
    const filas = Array.from(contenedor.current.querySelectorAll<HTMLElement>('[data-orden-id]'))
    const destino = filas.findIndex((f) => {
      const r = f.getBoundingClientRect()
      return e.clientY >= r.top && e.clientY <= r.bottom
    })
    const actual = arrastre.orden.findIndex((i) => claveItem(i) === arrastre.id)
    if (destino >= 0 && destino !== actual) setArrastre({ id: arrastre.id, orden: mover(arrastre.orden, actual, destino) })
  }

  const soltar = () => {
    if (!arrastre) return
    const cambio = arrastre.orden.some((item, i) => claveItem(item) !== claveItem(items[i]))
    setArrastre(null)
    if (cambio) alReordenar(arrastre.orden)
  }

  return (
    <ul ref={contenedor} aria-label={etiqueta} className="divide-y divide-borde/70">
      {lista.map((item, i) => {
        const id = claveItem(item)
        const arrastrando = arrastre?.id === id
        return (
          <m.li
            key={id}
            layout
            transition={{ type: 'spring', stiffness: 600, damping: 45 }}
            data-orden-id={id}
            className={cn('relative flex items-center gap-2 bg-white px-3 py-2.5 sm:px-4', arrastrando && 'z-10 rounded-control shadow-elevado ring-1 ring-borde')}
          >
            {!soloLectura && (
              <button
                type="button"
                aria-label={`Arrastrar ${nombreItem(item)}`}
                tabIndex={-1}
                onPointerDown={(e) => empezar(e, id)}
                onPointerMove={moverPuntero}
                onPointerUp={soltar}
                onPointerCancel={soltar}
                className={cn('flex size-8 shrink-0 touch-none items-center justify-center rounded-control transition-[background-color,box-shadow] duration-200', RELIEVE, TEXTO_RELIEVE, arrastrando ? 'cursor-grabbing' : 'cursor-grab')}
              >
                <GripVertical size={16} aria-hidden />
              </button>
            )}
            <div className="min-w-0 flex-1">{render(item, i + 1)}</div>
            {!soloLectura && (
              <span className="flex shrink-0 gap-0.5">
                <BotonIcono etiqueta={`Subir ${nombreItem(item)}`} disabled={i === 0 || arrastre !== null} onClick={() => alReordenar(mover(items, i, i - 1))}>
                  <ArrowUp size={15} />
                </BotonIcono>
                <BotonIcono etiqueta={`Bajar ${nombreItem(item)}`} disabled={i === lista.length - 1 || arrastre !== null} onClick={() => alReordenar(mover(items, i, i + 1))}>
                  <ArrowDown size={15} />
                </BotonIcono>
              </span>
            )}
          </m.li>
        )
      })}
    </ul>
  )
}
