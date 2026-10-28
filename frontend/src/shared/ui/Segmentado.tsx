import { useId } from 'react'
import * as m from 'motion/react-m'
import { cn } from './cn'

export interface OpcionSegmentado<T extends string> {
  valor: T
  etiqueta: string
}

interface Props<T extends string> {
  opciones: OpcionSegmentado<T>[]
  /** null = ninguna elegida (solo en `chips`, p. ej. cuando se eligió un rango a mano). */
  valor: T | null
  alCambiar: (valor: T) => void
  /** Nombre accesible del grupo. */
  etiqueta: string
  /**
   * pista: pista hundida con la opción elegida en relieve, que se desliza (cambio de vista).
   * chips: píldoras separadas que envuelven de línea (atajos, filtros con muchas opciones).
   */
  variante?: 'pista' | 'chips'
}

// Control de opción única: una sola implementación con variantes (regla 13).
export function Segmentado<T extends string>({ opciones, valor, alCambiar, etiqueta, variante = 'pista' }: Props<T>) {
  const id = useId()

  if (variante === 'chips') {
    return (
      <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activa = o.valor === valor
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={activa}
              onClick={() => alCambiar(o.valor)}
              className={cn(
                'h-8 rounded-full border px-3.5 text-chico font-medium transition-[background-color,color,box-shadow] duration-200',
                // Neumorfismo: la opción elegida queda hundida.
                activa ? 'border-rojo/20 bg-rojo-tenue text-rojo shadow-hundido' : 'border-superficie bg-superficie text-texto-2 shadow-relieve hover:bg-fondo-3 hover:text-texto active:shadow-hundido',
              )}
            >
              {o.etiqueta}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div role="group" aria-label={etiqueta} className="inline-flex rounded-control bg-superficie p-[3px] shadow-hundido">
      {opciones.map((o) => {
        const activa = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={activa}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              'relative h-7 rounded-[7px] px-3 text-chico font-medium transition-colors duration-150',
              activa ? 'text-texto' : 'text-texto-2 hover:bg-white/50 hover:text-texto active:bg-white/80',
            )}
          >
            {activa && (
              <m.span layoutId={`segmentado-${id}`} className="absolute inset-0 rounded-[7px] bg-white shadow-relieve" transition={{ type: 'spring', stiffness: 500, damping: 38 }} aria-hidden />
            )}
            <span className="relative">{o.etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}
