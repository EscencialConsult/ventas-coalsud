import { formatoMonto, formatoMontoEntero } from '@/shared/format/moneda'
import { cn } from './cn'

interface Props {
  valor: number
  /** Sin decimales: solo para resúmenes (KPIs, totales de gráficos). */
  entero?: boolean
  className?: string
}

// Monto en bolivianos (⚠ SUP-39). La unidad va más chica y en gris para que
// se lea primero la cifra; las cifras tabulares alinean los montos en columna.
export function MontoBs({ valor, entero = false, className }: Props) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      <span className="mr-[0.3em] text-[0.8em] font-normal text-texto-3">Bs</span>
      {entero ? formatoMontoEntero(valor) : formatoMonto(valor)}
    </span>
  )
}
