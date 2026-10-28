import { formatoCantidad } from '@/shared/format/cantidad'
import { cn } from '@/shared/ui/cn'

/** Cantidad con signo: + verde (entra), − rojo (sale). */
export function CantidadMovimiento({ valor }: { valor: number }) {
  return <span className={cn('font-medium tabular-nums', valor > 0 ? 'text-ok' : 'text-error')}>{`${valor > 0 ? '+' : '−'}${formatoCantidad(Math.abs(valor))}`}</span>
}
