import type { KeyboardEvent, ReactNode, SyntheticEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import * as m from 'motion/react-m'
import { cn } from './cn'
import { EmptyState, SkeletonFilas } from './Estados'

export interface Columna<T> {
  clave: string
  /** También es la etiqueta de cada dato en la vista de card (móvil). */
  titulo: string
  alinear?: 'izq' | 'der' | 'centro'
  /** Montos, números de documento y cantidades: cifras tabulares (alinean en columna). */
  numerico?: boolean
  className?: string
  /** En móvil, este dato es el título de la card en vez de una fila etiqueta: valor. */
  principalMovil?: boolean
  ocultarEnMovil?: boolean
  /**
   * Columna de acciones (íconos, interruptores): a la derecha en escritorio y
   * al pie de la card en móvil. Sus clics no disparan el clic de la fila.
   */
  acciones?: boolean
  render: (fila: T) => ReactNode
}

interface Props<T> {
  columnas: Columna<T>[]
  filas: T[] | undefined
  claveFila: (fila: T) => string
  cargando?: boolean
  vacio?: ReactNode
  /** Filas atenuadas y tachadas (p. ej. notas anuladas). */
  filaInactiva?: (fila: T) => boolean
  /** Filas atenuadas sin tachar (p. ej. maestros desactivados). */
  filaApagada?: (fila: T) => boolean
  alClicFila?: (fila: T) => void
  /** Nombre accesible de la tabla. */
  etiqueta: string
}

const ALINEAR = { izq: 'text-left', der: 'text-right', centro: 'text-center' }

// Entrada escalonada corta de las filas (solo al montar).
// Escalonado solo en las primeras filas: en listas largas el resto entra junto.
const FILA = { oculta: { opacity: 0, y: 4 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.2, delay: Math.min(i, 12) * 0.02 } }) }

const detener = (e: SyntheticEvent) => e.stopPropagation()

// Tabla base de los listados (regla 25): en escritorio, tabla; en pantallas
// chicas, cada fila colapsa a una card con los encabezados como etiquetas,
// sin scroll horizontal.
export function Tabla<T>({ columnas, filas, claveFila, cargando, vacio, filaInactiva, filaApagada, alClicFila, etiqueta }: Props<T>) {
  if (cargando) return <SkeletonFilas />
  if (!filas?.length) return <>{vacio ?? <EmptyState titulo="No hay registros" />}</>

  const principal = columnas.find((c) => c.principalMovil)
  const resto = columnas.filter((c) => !c.principalMovil && !c.ocultarEnMovil && !c.acciones)
  const acciones = columnas.filter((c) => c.acciones)

  // Filas clicables también con teclado (Enter / Espacio).
  const alTeclearFila = (fila: T) => (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      alClicFila?.(fila)
    }
  }

  return (
    <>
      <table className="hidden w-full border-collapse text-cuerpo md:table" aria-label={etiqueta}>
        <thead>
          <tr className="border-b border-borde bg-fondo-2">
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={cn('h-10 px-4 text-mini font-semibold tracking-wider whitespace-nowrap text-texto-3 uppercase', ALINEAR[c.alinear ?? (c.acciones ? 'der' : 'izq')], c.className)}
              >
                {c.acciones ? <span className="sr-only">{c.titulo}</span> : c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <m.tbody initial="oculta" animate="visible">
          {filas.map((fila, i) => (
            <m.tr
              key={claveFila(fila)}
              variants={FILA}
              custom={i}
              onClick={alClicFila ? () => alClicFila(fila) : undefined}
              onKeyDown={alClicFila ? alTeclearFila(fila) : undefined}
              tabIndex={alClicFila ? 0 : undefined}
              className={cn(
                'h-12 border-b border-borde/70 transition-colors last:border-b-0 hover:bg-fondo-2',
                alClicFila && 'cursor-pointer focus-visible:bg-rojo-tenue focus-visible:outline-none',
                filaInactiva?.(fila) && 'text-texto-3 line-through',
                filaApagada?.(fila) && 'text-texto-3',
              )}
            >
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  onClick={c.acciones ? detener : undefined}
                  onKeyDown={c.acciones ? detener : undefined}
                  className={cn('px-4 py-2.5', ALINEAR[c.alinear ?? (c.acciones ? 'der' : 'izq')], c.numerico && 'tabular-nums', c.acciones && 'w-px whitespace-nowrap', c.className)}
                >
                  {c.render(fila)}
                </td>
              ))}
            </m.tr>
          ))}
        </m.tbody>
      </table>

      <m.ul className="space-y-2.5 p-3 md:hidden" aria-label={etiqueta} initial="oculta" animate="visible">
        {filas.map((fila, i) => (
          <m.li
            key={claveFila(fila)}
            variants={FILA}
            custom={i}
            onClick={alClicFila ? () => alClicFila(fila) : undefined}
            className={cn(
              'rounded-control border border-borde bg-fondo-2 p-3.5',
              alClicFila && 'cursor-pointer transition-[background-color,box-shadow] hover:bg-white hover:shadow-card active:shadow-hundido',
              filaInactiva?.(fila) && 'text-texto-3 line-through',
              filaApagada?.(fila) && 'text-texto-3',
            )}
          >
            {principal && (
              <div className="mb-2 flex items-center justify-between gap-2">
                {/* El título es el botón de la card: así se llega con teclado sin anidar controles. */}
                {alClicFila ? (
                  <button type="button" onClick={(e) => {
                      detener(e)
                      alClicFila(fila)
                    }} className={cn('min-w-0 text-left text-medio font-semibold', principal.numerico && 'tabular-nums')}>
                    {principal.render(fila)}
                  </button>
                ) : (
                  <div className={cn('min-w-0 text-medio font-semibold', principal.numerico && 'tabular-nums')}>{principal.render(fila)}</div>
                )}
                {alClicFila && <ChevronRight size={16} className="shrink-0 text-texto-3" aria-hidden />}
              </div>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-cuerpo">
              {resto.map((c) => (
                <div key={c.clave} className="contents">
                  <dt className="text-mini font-semibold tracking-wider text-texto-3 uppercase">{c.titulo}</dt>
                  <dd className={cn('min-w-0 text-right break-words', c.numerico && 'tabular-nums')}>{c.render(fila)}</dd>
                </div>
              ))}
            </dl>
            {acciones.length > 0 && (
              <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-borde pt-2" onClick={detener}>
                {acciones.map((c) => (
                  <span key={c.clave}>{c.render(fila)}</span>
                ))}
              </div>
            )}
          </m.li>
        ))}
      </m.ul>
    </>
  )
}
