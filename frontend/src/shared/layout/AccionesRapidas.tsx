import { ChevronDown, Plus } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { Button } from '@/shared/ui/Button'
import { ChipIcono } from '@/shared/ui/ChipIcono'
import { cn } from '@/shared/ui/cn'
import { Desplegable, ItemDesplegable } from '@/shared/ui/Desplegable'
import { ACCIONES_RAPIDAS } from './navegacion'

// "+ Nuevo": altas frecuentes según permisos. Si el usuario no puede ninguna
// (p. ej. el nacional, que solo consulta), el botón no aparece.
export function AccionesRapidas() {
  const puede = usePermisos()
  const acciones = ACCIONES_RAPIDAS.filter((a) => puede(a.requiere))
  if (!acciones.length) return null

  return (
    <Desplegable
      etiqueta="Crear"
      className="w-64"
      disparador={(props, abierto) => (
        <Button {...props} aria-label="Crear nuevo" icono={<Plus size={16} />} className="px-2.5 sm:px-3.5">
          <span className="hidden sm:inline">Nuevo</span>
          <ChevronDown size={14} className={cn('hidden opacity-80 transition-transform duration-200 sm:block', abierto && 'rotate-180')} aria-hidden />
        </Button>
      )}
    >
      {(cerrar) => (
        <>
          <p className="px-2.5 pt-1.5 pb-2 text-mini font-semibold tracking-wider text-texto-3 uppercase">Crear</p>
          {acciones.map((a) => (
            <ItemDesplegable key={a.ruta} a={a.ruta} onClick={cerrar} icono={<ChipIcono icono={a.icono} tono="rojo" tam="sm" />}>
              {a.etiqueta}
            </ItemDesplegable>
          ))}
        </>
      )}
    </Desplegable>
  )
}
