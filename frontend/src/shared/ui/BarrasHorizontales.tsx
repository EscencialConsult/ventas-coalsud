import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { cn } from './cn'
import { TONOS, type Tono } from './tonos'

export interface ItemBarra {
  id: string
  etiqueta: string
  valor: number
}

interface Props {
  items: ItemBarra[]
  formato: (n: number) => ReactNode
  tono?: Tono
  /** Muestra la participación de cada ítem sobre el total. */
  conParticipacion?: boolean
}

// Barras horizontales (⚙ DT-16): etiqueta y valor en texto (lo que leen los
// lectores de pantalla, regla 32) y la barra como apoyo visual. La barra crece
// al montar con una transformación, sin anchos inline.
export function BarrasHorizontales({ items, formato, tono = 'rojo', conParticipacion = false }: Props) {
  const maximo = Math.max(1, ...items.map((i) => i.valor))
  const total = items.reduce((s, i) => s + i.valor, 0)

  return (
    <ul className="space-y-4">
      {items.map((item, indice) => (
        <li key={item.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-cuerpo">
            <span className="truncate font-medium text-texto-2">{item.etiqueta}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formato(item.valor)}
              {conParticipacion && total > 0 && <span className="ml-2 text-chico text-texto-3">{Math.round((item.valor / total) * 100)} %</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-superficie" aria-hidden>
            <m.div
              className={cn('h-full origin-left rounded-full', TONOS[tono].solido)}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.max(0, item.valor) / maximo }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: indice * 0.06 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
