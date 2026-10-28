import type { MovimientoPeriodo } from '@/core/models/reportes'
import { formatoMonto } from '@/shared/format/moneda'

// Debajo de la matriz del movimiento por período: lo que entró y salió de caja en el rango (Reglas §9).
export function PieMovimiento({ pie }: { pie: MovimientoPeriodo['pie'] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-mini tabular-nums text-texto-2">
      <span>Cobranzas del período Bs {formatoMonto(pie.cobranzas)}</span>
      {pie.reembolsos > 0 && <span>Reembolsos Bs {formatoMonto(pie.reembolsos)}</span>}
    </div>
  )
}
