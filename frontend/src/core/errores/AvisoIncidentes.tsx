import { useEffect, useState } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { ChipIcono } from '@/shared/ui/ChipIcono'
import { DetalleIncidente } from './DetalleIncidente'
import { descartarIncidente, suscribirIncidentes, type Incidente } from './incidentes'

// Aviso flotante para errores inesperados que no tumban la pantalla
// (clics, timers, promesas sin catch, respuestas no reconocidas).
export function AvisoIncidentes() {
  const [lista, setLista] = useState<Incidente[]>([])
  useEffect(() => suscribirIncidentes(setLista), [])

  const ultimo = lista[lista.length - 1]
  if (!ultimo) return null

  return (
    <section
      role="alert"
      className="animar-entrada fixed inset-x-3 bottom-3 z-[310] rounded-card border border-borde bg-white p-4 shadow-elevado sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[440px]"
    >
      <header className="mb-3 flex items-center gap-3">
        <ChipIcono icono={CircleAlert} tono="error" tam="sm" />
        <h2 className="flex-1 text-subtitulo font-semibold">
          Ocurrió un error inesperado
          {lista.length > 1 && <span className="ml-1 text-cuerpo font-normal text-texto-3">(y {lista.length - 1} más)</span>}
        </h2>
        <BotonIcono etiqueta="Cerrar aviso" sinTooltip onClick={() => descartarIncidente(ultimo.codigo)}>
          <X size={16} />
        </BotonIcono>
      </header>
      <DetalleIncidente incidente={ultimo} />
    </section>
  )
}
