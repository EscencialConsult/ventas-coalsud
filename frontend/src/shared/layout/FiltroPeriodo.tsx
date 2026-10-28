import { useState } from 'react'
import { CalendarDays, Filter, SlidersHorizontal, X } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import { etiquetaFiltro, textoRango } from '@/core/periodo/periodos'
import { usePeriodoDashboard } from '@/core/periodo/usePeriodoDashboard'
import { formatoFecha } from '@/shared/format/fecha'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { useTooltip } from '@/shared/ui/useTooltip'
import { ModalFiltroPeriodo } from './ModalFiltroPeriodo'

/** Fecha de operación (la del servidor), sin acciones. */
export function FechaOperacion() {
  const hoy = useHoy()
  const { propsDisparador, tooltip } = useTooltip<HTMLSpanElement>('Fecha de operación')
  return (
    <>
      <span {...propsDisparador} className="hidden items-center gap-1.5 px-2 text-cuerpo text-texto-2 tabular-nums md:flex">
        <CalendarDays size={14} className="text-texto-3" aria-hidden />
        <span className="sr-only">Fecha de operación:</span>
        {formatoFecha(hoy)}
      </span>
      {tooltip}
    </>
  )
}

// Filtro de período del dashboard en el topbar (⚙ DT-23). Sin filtro: la
// fecha de operación y el botón de ajustes. Con filtro: una pastilla de color
// marca que los datos están filtrados (para que nadie piense que "faltan"),
// con su botón para quitarlo.
export function FiltroPeriodo() {
  const { filtro, quitar } = usePeriodoDashboard()
  const [abierto, setAbierto] = useState(false)
  // Cada apertura remonta el modal: su borrador arranca del filtro vigente.
  const [apertura, setApertura] = useState(0)
  const abrir = () => {
    setApertura((n) => n + 1)
    setAbierto(true)
  }

  return (
    <>
      {filtro ? (
        <span className="flex h-7 items-center rounded-[5px] bg-rojo-tenue text-rojo ring-1 ring-rojo/25 ring-inset">
          <button
            type="button"
            onClick={abrir}
            aria-label={`Filtro de fecha activo: ${etiquetaFiltro(filtro)}, ${textoRango(filtro)}. Cambiar`}
            className="flex h-7 items-center gap-1.5 rounded-l-[5px] pr-1.5 pl-2.5 text-cuerpo font-medium transition-colors hover:bg-rojo/10 active:bg-rojo/15"
          >
            <Filter size={14} aria-hidden />
            <span className="hidden sm:inline">{etiquetaFiltro(filtro)}</span>
            <span className="hidden font-normal tabular-nums lg:inline">· {textoRango(filtro)}</span>
          </button>
          <BotonIcono etiqueta="Quitar filtro de fecha" variante="marca" onClick={quitar}>
            <X size={14} />
          </BotonIcono>
        </span>
      ) : (
        <>
          <FechaOperacion />
          <BotonIcono etiqueta="Filtrar por fecha" variante="interno" onClick={abrir}>
            <SlidersHorizontal size={14} />
          </BotonIcono>
        </>
      )}
      <ModalFiltroPeriodo key={apertura} abierto={abierto} alCerrar={() => setAbierto(false)} />
    </>
  )
}
