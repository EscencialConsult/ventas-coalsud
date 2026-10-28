import { Check, ChevronDown, Globe, MapPin } from 'lucide-react'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { cn } from '@/shared/ui/cn'
import { Desplegable, ItemDesplegable } from '@/shared/ui/Desplegable'
import { useTooltip } from '@/shared/ui/useTooltip'

// Pastilla blanca dentro de la pista hundida de ContextoOperacion (misma familia que Segmentado).
const DISPARADOR = 'flex h-7 items-center gap-1.5 rounded-[5px] bg-white px-2.5 text-cuerpo font-medium'

// Selector de regional activa (RNF-18): nacional "Todas" + cada una; regional
// con varias, entre las suyas; regional con una, fija (Arquitectura FE §3).
export function SelectorRegional({ bloqueado = false }: { bloqueado?: boolean }) {
  const { regionalActiva, regionalActivaId, opciones, permiteTodas, fija, cambiar } = useRegionalActiva()
  const { propsDisparador, tooltip } = useTooltip<HTMLButtonElement>('Guarde o descarte los cambios para cambiar de regional', { desactivado: !bloqueado })

  if (fija) {
    return (
      <span className={cn(DISPARADOR, 'shadow-card')}>
        <MapPin size={14} className="text-rojo" aria-hidden />
        {regionalActiva?.nombre ?? '—'}
      </span>
    )
  }

  return (
    <Desplegable
      etiqueta="Regional activa"
      alinear="izq"
      anclaje="contenedor"
      className="w-64 min-w-full"
      disparador={(props, abierto) => (
        <>
          <button
            type="button"
            {...props}
            {...propsDisparador}
            onClick={bloqueado ? undefined : props.onClick}
            aria-disabled={bloqueado || undefined}
            aria-label={`Regional activa: ${regionalActiva?.nombre ?? 'todas las regionales'}`}
            className={cn(
              DISPARADOR,
              'shadow-card transition-[background-color,box-shadow] duration-200 aria-expanded:bg-fondo-2 aria-expanded:shadow-hundido',
              bloqueado ? 'cursor-not-allowed opacity-60' : 'hover:bg-fondo-2 active:shadow-hundido',
            )}
          >
            {regionalActiva ? <MapPin size={14} className="text-rojo" aria-hidden /> : <Globe size={14} className="text-rojo" aria-hidden />}
            <span className="sm:hidden">{regionalActiva?.codigo ?? 'Todas'}</span>
            <span className="hidden sm:inline">{regionalActiva?.nombre ?? 'Todas las regionales'}</span>
            <ChevronDown size={13} className={cn('text-texto-3 transition-transform duration-200', abierto && 'rotate-180')} aria-hidden />
          </button>
          {tooltip}
        </>
      )}
    >
      {(cerrar) => (
        <>
          <p className="px-2.5 pt-1.5 pb-2 text-mini font-semibold tracking-wider text-texto-3 uppercase">Regional activa</p>
          {permiteTodas && (
            <Opcion
              nombre="Todas las regionales"
              detalle="Vista consolidada"
              seleccionada={regionalActivaId === null}
              alElegir={() => {
                cambiar(null)
                cerrar()
              }}
            />
          )}
          {opciones.map((r) => (
            <Opcion
              key={r.id}
              nombre={r.nombre}
              detalle={r.codigo}
              seleccionada={r.id === regionalActivaId}
              alElegir={() => {
                cambiar(r.id)
                cerrar()
              }}
            />
          ))}
        </>
      )}
    </Desplegable>
  )
}

function Opcion({ nombre, detalle, seleccionada, alElegir }: { nombre: string; detalle: string; seleccionada: boolean; alElegir: () => void }) {
  return (
    <ItemDesplegable seleccionado={seleccionada} onClick={alElegir}>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate">{nombre}</span>
          <span className="block text-mini font-normal text-texto-3">{detalle}</span>
        </span>
        {seleccionada && <Check size={15} className="shrink-0" aria-hidden />}
      </span>
    </ItemDesplegable>
  )
}
