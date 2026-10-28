import { useState } from 'react'
import { CalendarRange, X } from 'lucide-react'
import { formatoFecha, formatoFechaCorta } from '@/shared/format/fecha'
import { Button } from './Button'
import { Calendario } from './Calendario'
import { cn } from './cn'
import { RELIEVE, TEXTO_RELIEVE } from './neumorfismo'
import { PanelFlotante } from './PanelFlotante'
import { useAnclaje } from './useAnclaje'

interface Props {
  /** 'YYYY-MM-DD' o '' (sin filtro). */
  desde: string
  hasta: string
  alCambiar: (desde: string, hasta: string) => void
  max?: string
  etiqueta?: string
  /** Resaltar en rojo cuando hay rango (no si el rango es el predeterminado de la pantalla). */
  resaltar?: boolean
  /** Un solo día (hoja de carga): desde = hasta y se aplica con un clic. */
  modo?: 'rango' | 'dia'
}

// Rango de fechas de las barras de filtro: botón en relieve (como FiltroSelect)
// que abre el calendario. El filtro se aplica al elegir el segundo día.
export function FiltroFechas({ desde, hasta, alCambiar, max, etiqueta = 'Fechas', resaltar = true, modo = 'rango' }: Props) {
  const anclaje = useAnclaje<HTMLButtonElement, HTMLDivElement>(480)
  const { disparador, abierto, abrir, cerrar } = anclaje
  const [borrador, setBorrador] = useState<{ desde: string | null; hasta: string | null }>({ desde: null, hasta: null })
  const filtrando = Boolean(desde && hasta)
  const destacado = filtrando && resaltar
  const texto = !filtrando ? etiqueta : modo === 'dia' ? formatoFecha(desde) : `${formatoFechaCorta(desde)} – ${formatoFechaCorta(hasta)}`

  const alternar = () => {
    if (abierto) return cerrar()
    setBorrador({ desde: desde || null, hasta: hasta || null })
    abrir()
  }

  const terminar = (d: string, h: string) => {
    cerrar()
    disparador.current?.focus()
    alCambiar(d, h)
  }

  return (
    <>
      <button
        ref={disparador}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={filtrando ? `${etiqueta}: ${texto}` : etiqueta}
        onClick={alternar}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-control px-3 text-cuerpo font-medium transition-[background-color,color,box-shadow] duration-150 sm:w-auto',
          RELIEVE,
          destacado ? 'text-rojo' : TEXTO_RELIEVE,
        )}
      >
        <CalendarRange size={15} className={destacado ? 'text-rojo' : 'text-texto-3'} aria-hidden />
        <span className="tabular-nums">{texto}</span>
      </button>
      <PanelFlotante anclaje={anclaje} etiqueta={etiqueta}>
        <Calendario
          modo={modo}
          desde={borrador.desde}
          hasta={borrador.hasta}
          max={max}
          etiqueta={etiqueta}
          alCambiar={(d, h) => (h ? terminar(d, h) : setBorrador({ desde: d, hasta: null }))}
        />
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-borde pt-3 text-chico text-texto-3">
          <span>{modo === 'dia' ? 'Elija el día' : borrador.desde && !borrador.hasta ? 'Elija el último día' : 'Elija el primer día'}</span>
          {destacado && (
            <Button tam="sm" variante="secundario" icono={<X size={13} className="text-rojo" />} onClick={() => terminar('', '')}>
              Quitar
            </Button>
          )}
        </div>
      </PanelFlotante>
    </>
  )
}
