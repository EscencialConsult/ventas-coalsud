import { Plus } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { useCobranzasDia } from '@/features/cobranzas/cobranzas.queries'
import { TablaCobranzas } from '@/features/cobranzas/components/TablaCobranzas'
import { BotonEnlace } from '@/shared/ui/Button'

/** Pestaña Cobranzas (06-pantallas/09 §3): las del día, anular y "+ Registrar cobro" con la fecha del reporte (⚠ SUP-51). */
export function CobranzasDiaTab({ regionalId, fecha, abierta }: { regionalId: string; fecha: string; abierta: boolean }) {
  const consulta = useCobranzasDia(regionalId, fecha)
  const puedeRegistrar = usePermisos()('cobranza.registrar')
  const volver = encodeURIComponent(`/liquidacion/${fecha}?pestana=cobranzas`)
  return (
    <div>
      {abierta && puedeRegistrar && (
        <div className="flex justify-end border-b border-borde px-4 py-3">
          <BotonEnlace a={`/cobranzas/nueva?fecha=${fecha}&volver=${volver}`} variante="primario" icono={<Plus size={16} />}>
            Registrar cobro
          </BotonEnlace>
        </div>
      )}
      <TablaCobranzas consulta={consulta} conDocumento etiqueta="Cobranzas del día" vacio="Sin cobranzas en el día" />
    </div>
  )
}
