import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BotonIcono } from './BotonIcono'

interface Props {
  /** 1 = la primera. */
  pagina: number
  total: number
  porPagina: number
  alCambiar: (pagina: number) => void
  /** "clientes", "productos"… para el texto del total. */
  unidad: string
}

// Paginación de servidor (06-pantallas/00 §2): "1–50 de 312" a la derecha.
export function Paginacion({ pagina, total, porPagina, alCambiar, unidad }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total ? (pagina - 1) * porPagina + 1 : 0
  const hasta = Math.min(total, pagina * porPagina)

  return (
    <nav aria-label={`Páginas de ${unidad}`} className="flex items-center justify-between gap-3 border-t border-borde px-4 py-2.5 text-chico text-texto-3">
      <span className="tabular-nums">
        {total > porPagina ? (
          <>
            <b className="font-semibold text-texto-2">
              {desde}–{hasta}
            </b>{' '}
            de {total.toLocaleString('en-US')} {unidad}
          </>
        ) : (
          `${total.toLocaleString('en-US')} ${unidad}`
        )}
      </span>
      {paginas > 1 && (
        <span className="flex items-center gap-1">
          <BotonIcono etiqueta="Página anterior" ladoTooltip="arriba" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
            <ChevronLeft size={16} />
          </BotonIcono>
          <span className="px-1 tabular-nums" aria-current="page">
            {pagina} / {paginas}
          </span>
          <BotonIcono etiqueta="Página siguiente" ladoTooltip="arriba" disabled={pagina >= paginas} onClick={() => alCambiar(pagina + 1)}>
            <ChevronRight size={16} />
          </BotonIcono>
        </span>
      )}
    </nav>
  )
}
