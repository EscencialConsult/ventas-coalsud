import { ArrowRight } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { formatoFecha } from '@/shared/format/fecha'
import { BotonEnlace } from '@/shared/ui/Button'
import { Alerta } from '@/shared/ui/Estados'

// Días anteriores sin cerrar (06-pantallas/00 §1). El cierre es secuencial
// (⚠ SUP-20): mientras haya uno abierto, no se puede cerrar el siguiente.
export function BannerDia() {
  const { data } = useAvisos()
  const { opciones } = useRegionalActiva()
  const dias = data?.dias_pendientes ?? []
  if (!dias.length) return null

  const codigo = (id: string) => opciones.find((r) => r.id === id)?.codigo ?? ''
  const primero = [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha))[0]

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-5 lg:px-6">
      <Alerta
        tipo="alerta"
        className="shadow-card"
        accion={
          <BotonEnlace a={`/liquidacion/${primero.fecha}?regional=${primero.regional_id}`} tam="sm" icono={<ArrowRight size={14} />}>
            Ir a liquidación
          </BotonEnlace>
        }
      >
        <b>{dias.length === 1 ? 'Hay 1 día sin cerrar' : `Hay ${dias.length} días sin cerrar`}:</b>{' '}
        {dias.map((d) => `${formatoFecha(d.fecha)} (${codigo(d.regional_id)})`).join(', ')}
      </Alerta>
    </div>
  )
}
