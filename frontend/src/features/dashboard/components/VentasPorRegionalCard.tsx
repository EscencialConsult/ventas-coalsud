import { MapPinned } from 'lucide-react'
import { usePeriodoDashboard } from '@/core/periodo/usePeriodoDashboard'
import { BarrasHorizontales } from '@/shared/ui/BarrasHorizontales'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { useVentasPorRegional } from '../dashboard.queries'

const montoEntero = (n: number) => <MontoBs valor={n} entero />

export function VentasPorRegionalCard() {
  const consulta = useVentasPorRegional()
  const filtrado = usePeriodoDashboard().filtro !== null
  return (
    <Card titulo="Ventas por regional" icono={MapPinned} tono="rojo">
      <SeccionConsulta
        consulta={consulta}
        cargando={
          <div className="space-y-4">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        }
      >
        {(ventas) => {
          // El total sale de las filas ya cargadas (regla 32).
          const total = ventas.reduce((s, v) => s + v.ventas_netas, 0)
          return (
            <>
              <div className="mb-5 flex items-baseline justify-between gap-3 rounded-control bg-fondo-2 px-4 py-3">
                <span className="text-cuerpo text-texto-2">{filtrado ? 'Total del período' : 'Total del mes'}</span>
                <MontoBs valor={total} entero className="text-cifra font-semibold tracking-tight" />
              </div>
              <BarrasHorizontales items={ventas.map((v) => ({ id: v.regional_id, etiqueta: v.regional, valor: v.ventas_netas }))} formato={montoEntero} conParticipacion />
            </>
          )
        }}
      </SeccionConsulta>
    </Card>
  )
}
