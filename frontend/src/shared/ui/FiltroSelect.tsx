import type { ReactNode } from 'react'
import { Selector, type OpcionSelector } from './Selector'

export type OpcionFiltro = OpcionSelector

interface Props {
  etiqueta: string
  valor: string
  opciones: OpcionFiltro[]
  alCambiar: (valor: string) => void
  /** Listas largas (productos). */
  buscable?: boolean
}

// Select compacto de las barras de filtro (sin etiqueta visible: la primera
// opción la dice, p. ej. "Todas las categorías"). Resaltado si filtra algo.
export function FiltroSelect({ etiqueta, valor, opciones, alCambiar, buscable }: Props) {
  return <Selector variante="filtro" etiqueta={etiqueta} valor={valor} opciones={opciones} alCambiar={alCambiar} buscable={buscable} destacado={valor !== (opciones[0]?.valor ?? '')} />
}

/** Barra de filtros: en móvil cada control ocupa el 100 % y envuelve de línea (regla 25). */
export function BarraFiltros({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-borde px-4 py-3">{children}</div>
}
