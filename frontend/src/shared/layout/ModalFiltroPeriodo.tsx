import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import { MAX_DIAS_RANGO, PRESETS, cantidadDias, rangoDePreset, rangoMesEnCurso, type FiltroPeriodo, type PresetPeriodo } from '@/core/periodo/periodos'
import { usePeriodoDashboard } from '@/core/periodo/usePeriodoDashboard'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { formatoFecha } from '@/shared/format/fecha'
import { Button } from '@/shared/ui/Button'
import { Calendario } from '@/shared/ui/Calendario'
import { cn } from '@/shared/ui/cn'
import { Alerta } from '@/shared/ui/Estados'
import { Modal } from '@/shared/ui/Modal'
import { HUNDIDO } from '@/shared/ui/neumorfismo'
import { Segmentado, type OpcionSegmentado } from '@/shared/ui/Segmentado'

// 'mes' = sin filtro (mes en curso, lo predeterminado del dashboard).
type Atajo = Exclude<PresetPeriodo, 'rango'> | 'mes'

interface Borrador {
  /** 'rango' = elegido a mano en el calendario (ningún atajo marcado). */
  opcion: Atajo | 'rango'
  desde: string | null
  hasta: string | null
}

const ATAJOS: OpcionSegmentado<Atajo>[] = [{ valor: 'mes', etiqueta: 'Mes en curso' }, ...PRESETS.map((p) => ({ valor: p.preset, etiqueta: p.etiqueta }))]

// Campo de solo lectura que muestra un extremo del rango; resaltado cuando el
// próximo clic en el calendario va a definirlo.
function ExtremoRango({ etiqueta, fecha, activo }: { etiqueta: string; fecha: string | null; activo: boolean }) {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 rounded-control px-3.5 py-2 transition-[border-color,background-color] duration-150',
        HUNDIDO,
        activo ? 'border-rojo/50 bg-white ring-3 ring-rojo/10' : 'border-superficie',
      )}
    >
      <div className="text-mini font-medium text-texto-3">{etiqueta}</div>
      <div className={cn('text-medio tabular-nums', fecha ? 'font-semibold text-texto' : 'text-texto-3')}>{fecha ? formatoFecha(fecha) : 'dd/mm/aaaa'}</div>
    </div>
  )
}

// El modal trabaja sobre un borrador: nada cambia en el dashboard hasta
// "Aplicar". Quien lo abre lo remonta con un `key` nuevo en cada apertura,
// así el borrador arranca del filtro vigente.
export function ModalFiltroPeriodo({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const hoy = useHoy()
  const ancho = useMediaQuery('(min-width: 640px)')
  const { filtro, aplicar, quitar } = usePeriodoDashboard()
  const [borrador, setBorrador] = useState<Borrador>(() => {
    if (filtro) return { opcion: filtro.preset, desde: filtro.desde, hasta: filtro.hasta }
    return { opcion: 'mes', ...rangoMesEnCurso(hoy) }
  })

  const elegirAtajo = (atajo: Atajo) => setBorrador({ opcion: atajo, ...(atajo === 'mes' ? rangoMesEnCurso(hoy) : rangoDePreset(atajo, hoy)) })

  const dias = borrador.desde && borrador.hasta ? cantidadDias({ desde: borrador.desde, hasta: borrador.hasta }) : 0
  const excedido = dias > MAX_DIAS_RANGO
  const listo = dias > 0 && !excedido
  const eligiendoFin = Boolean(borrador.desde && !borrador.hasta)

  const confirmar = () => {
    if (!borrador.desde || !borrador.hasta) return
    if (borrador.opcion === 'mes') quitar()
    else aplicar({ preset: borrador.opcion, desde: borrador.desde, hasta: borrador.hasta } satisfies FiltroPeriodo)
    alCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Filtrar el dashboard por fecha"
      tam="lg"
      alCerrar={alCerrar}
      pie={
        <>
          {filtro && (
            <Button
              variante="secundario"
              className="mr-auto"
              icono={<X size={14} className="text-rojo" />}
              onClick={() => {
                quitar()
                alCerrar()
              }}
            >
              Quitar filtro
            </Button>
          )}
          <Button variante="secundario" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!listo}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Segmentado variante="chips" etiqueta="Atajos de período" opciones={ATAJOS} valor={borrador.opcion === 'rango' ? null : borrador.opcion} alCambiar={elegirAtajo} />

        <div className="flex items-center gap-2.5" aria-live="polite">
          <ExtremoRango etiqueta="Desde" fecha={borrador.desde} activo={!borrador.desde} />
          <ArrowRight size={16} className="shrink-0 text-texto-3" aria-hidden />
          <ExtremoRango etiqueta="Hasta" fecha={borrador.hasta} activo={eligiendoFin} />
          <div className={cn('w-16 shrink-0 text-right text-cuerpo tabular-nums', excedido ? 'font-semibold text-error' : 'text-texto-2')}>
            {dias > 0 && (
              <>
                <b className="block text-medio font-semibold">{dias}</b>
                <span className="text-chico text-texto-3">{dias === 1 ? 'día' : 'días'}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center rounded-card border border-borde px-3 py-4">
          <Calendario
            etiqueta="Elegir el rango"
            meses={ancho ? 2 : 1}
            desde={borrador.desde}
            hasta={borrador.hasta}
            max={hoy}
            mostrar={borrador.opcion === 'rango' ? null : borrador.hasta}
            alCambiar={(desde, hasta) => setBorrador({ opcion: 'rango', desde, hasta })}
          />
        </div>

        {excedido && <Alerta tipo="error">El rango puede tener hasta {MAX_DIAS_RANGO} días.</Alerta>}
      </div>
    </Modal>
  )
}
