import type { ArqueoLiquidacion } from '@/core/models/liquidacion'
import { etiquetaFormaPago } from '@/features/cobranzas/cobranzas.opciones'
import { formatoMonto } from '@/shared/format/moneda'
import { cn } from '@/shared/ui/cn'

interface Fila {
  etiqueta: string
  valor: number
  enfasis?: 'total' | 'efectivo'
}

interface Props {
  arqueo: ArqueoLiquidacion
  /** caja: el recuadro de la planilla (impresión); franja: una fila compacta sobre la matriz (pantalla). */
  variante?: 'caja' | 'franja'
}

// Caja de arqueo (Reglas §3.3). Debajo, el desglose informativo de las
// cobranzas por forma de pago (⚠ SUP-12).
export function CajaArqueo({ arqueo, variante = 'caja' }: Props) {
  const filas: Fila[] = [
    { etiqueta: 'Contado', valor: arqueo.contado },
    { etiqueta: 'Crédito', valor: arqueo.credito },
    { etiqueta: 'Cobranzas', valor: arqueo.cobranzas },
    ...(arqueo.reembolsos > 0 ? [{ etiqueta: '(Reembolsos)', valor: -arqueo.reembolsos }] : []),
    { etiqueta: 'Total ventas', valor: arqueo.total_ventas, enfasis: 'total' },
    { etiqueta: 'Total efectivo', valor: arqueo.total_efectivo, enfasis: 'efectivo' },
  ]
  const formas = arqueo.cobranzas_por_forma.length > 0 && (
    <p className={cn('text-chico text-texto-3 tabular-nums', variante === 'caja' ? 'mt-3 border-t border-borde pt-2' : 'mt-2')}>
      {arqueo.cobranzas_por_forma.map((c) => `${etiquetaFormaPago(c.forma_pago)} ${formatoMonto(c.importe)}`).join(' · ')}
    </p>
  )

  if (variante === 'franja') {
    return (
      <section aria-label="Caja de arqueo" className="border-b border-borde px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 tabular-nums sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-x-10">
          {filas.map((f) => (
            <div key={f.etiqueta}>
              <dt className="text-mini tracking-wide text-texto-3 uppercase">{f.etiqueta}</dt>
              <dd className={cn('text-medio', f.enfasis && 'font-semibold', f.enfasis === 'efectivo' && 'text-rojo')}>{formatoMonto(f.valor)}</dd>
            </div>
          ))}
        </dl>
        {formas}
      </section>
    )
  }

  return (
    <section aria-label="Caja de arqueo" className="w-full rounded-card border border-borde bg-fondo p-4 shadow-card sm:w-80">
      <dl className="grid gap-1.5 tabular-nums">
        {filas.map((f) => (
          <div
            key={f.etiqueta}
            className={cn(
              'flex items-baseline justify-between gap-4',
              f.enfasis === 'total' && 'border-t border-borde pt-2 font-semibold',
              f.enfasis === 'efectivo' && 'font-semibold text-rojo',
            )}
          >
            <dt className="text-chico tracking-wide uppercase">{f.etiqueta}</dt>
            <dd className={cn(f.enfasis === 'efectivo' && 'text-subtitulo')}>{formatoMonto(f.valor)}</dd>
          </div>
        ))}
      </dl>
      {formas}
    </section>
  )
}
