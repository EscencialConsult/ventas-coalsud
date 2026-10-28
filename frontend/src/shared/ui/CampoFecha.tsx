import type { ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import { formatoFecha } from '@/shared/format/fecha'
import { Calendario } from './Calendario'
import { Campo } from './Campo'
import { cn } from './cn'
import { PanelFlotante } from './PanelFlotante'
import { useAnclaje } from './useAnclaje'

interface Props {
  label: string
  /** 'YYYY-MM-DD' o '' sin fecha. */
  valor: string
  alCambiar: (fecha: string) => void
  min?: string
  /** P. ej. hoy del servidor: no se registran documentos con fecha futura. */
  max?: string
  requerido?: boolean
  error?: string
  ayuda?: ReactNode
  disabled?: boolean
  className?: string
}

// Campo de fecha propio (regla 12): mismo aspecto que los demás campos y el
// calendario del sistema en un panel anclado.
export function CampoFecha({ label, valor, alCambiar, min, max, requerido, error, ayuda, disabled, className }: Props) {
  const anclaje = useAnclaje<HTMLButtonElement, HTMLDivElement>(440)
  const { disparador, abierto, abrir, cerrar } = anclaje

  return (
    <>
      <Campo label={label} requerido={requerido} error={error} ayuda={ayuda} icono={CalendarDays} className={className}>
        {(p) => (
          <button
            ref={disparador}
            type="button"
            {...p}
            aria-haspopup="dialog"
            aria-expanded={abierto}
            disabled={disabled}
            onClick={() => (abierto ? cerrar() : abrir())}
            className={cn(p.className, 'flex h-[38px] cursor-pointer items-center text-left tabular-nums disabled:cursor-not-allowed')}
          >
            {valor ? formatoFecha(valor) : <span className="text-texto-3">dd/mm/aaaa</span>}
          </button>
        )}
      </Campo>
      <PanelFlotante anclaje={anclaje} etiqueta={label}>
        <Calendario
          modo="dia"
          desde={valor || null}
          hasta={valor || null}
          min={min}
          max={max}
          etiqueta={label}
          alCambiar={(fecha) => {
            cerrar()
            disparador.current?.focus()
            if (fecha !== valor) alCambiar(fecha)
          }}
        />
      </PanelFlotante>
    </>
  )
}
