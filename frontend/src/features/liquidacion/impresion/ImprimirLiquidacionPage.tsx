import { useParams, useSearchParams } from 'react-router-dom'
import { EMPRESA } from '@/core/empresa'
import { mapearError } from '@/core/errores/mapearError'
import { etiquetaFormaPago } from '@/features/cobranzas/cobranzas.opciones'
import { formatoFecha, formatoFechaHora } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'
import { PrintLayout } from '@/shared/print/PrintLayout'
import { cn } from '@/shared/ui/cn'
import { Alerta, Skeleton } from '@/shared/ui/Estados'
import { CajaArqueo } from '../components/CajaArqueo'
import { MatrizLiquidacion } from '../components/MatrizLiquidacion'
import { useReporteLiquidacion } from '../liquidacion.queries'

// /imprimir/liquidacion/:fecha?regional= — A4 horizontal, catálogo completo
// por línea, arqueo arriba a la derecha y bloques de detalle al final
// (07-Impresion §4.1). El encabezado de la matriz se repite en cada hoja.
export default function ImprimirLiquidacionPage() {
  const { fecha = '' } = useParams()
  const [params] = useSearchParams()
  const consulta = useReporteLiquidacion(params.get('regional'), fecha)
  const r = consulta.data

  return (
    <PrintLayout titulo={`Liquidación · ${formatoFecha(fecha)}`} listo={Boolean(r)}>
      {consulta.isError && (
        <Alerta tipo="error" className="w-[297mm] max-w-full">
          {mapearError(consulta.error).message}
        </Alerta>
      )}
      {consulta.isPending && <Skeleton className="h-[210mm] w-[297mm] max-w-full" />}
      {r && (
        <section className="w-[297mm] bg-fondo p-[8mm] text-mini text-texto shadow-card [page:horizontal] print:w-auto print:p-0 print:shadow-none">
          <header className="mb-3 flex items-start justify-between gap-6">
            <div>
              <p className="font-marca text-subtitulo font-extrabold">{EMPRESA.razonSocial}</p>
              <p className="text-medio font-bold">RESUMEN DE REPORTE DE VENTAS</p>
              <p className="font-semibold">REGIONAL: {r.regional.nombre.toUpperCase()} — CONSOLIDADO</p>
              <p className="font-semibold tabular-nums">FECHA: {formatoFecha(r.fecha)}</p>
              {r.estado === 'cerrada' && (
                <p className="mt-1 text-texto-2">
                  Cerrado por {r.cerrada_por} el {formatoFechaHora(r.cerrada_en)}
                </p>
              )}
            </div>
            <div className="w-72 [&_section]:shadow-none">
              <CajaArqueo arqueo={r.arqueo} />
            </div>
          </header>

          <MatrizLiquidacion reporte={r} impresion />

          <div className="mt-4 grid grid-cols-2 gap-6 break-inside-avoid">
            <table className="w-full border-collapse tabular-nums">
              <caption className="pb-1 text-left font-semibold">CRÉDITOS / DETALLE DE NOTAS</caption>
              <tbody>
                {r.notas.map((n) => (
                  <tr key={n.id} className={cn('border-b border-texto/20', n.estado === 'anulada' && 'text-texto-3 line-through', n.condicion === 'credito' && n.estado === 'emitida' && 'bg-planilla-credito')}>
                    <td className="py-0.5">{n.numero_factura ?? 'PENDIENTE'}</td>
                    <td className="py-0.5">{n.numero}</td>
                    <td className="py-0.5">{n.cliente}</td>
                    <td className="py-0.5">{n.vendedor}</td>
                    <td className="py-0.5 text-right">{formatoMonto(n.total)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td colSpan={4} className="py-1">
                    TOTAL BS.- ({r.subtotales_notas.cantidad})
                  </td>
                  <td className="py-1 text-right">{formatoMonto(r.subtotales_notas.total)}</td>
                </tr>
              </tbody>
            </table>
            <div className="grid content-start gap-4">
              <table className="w-full border-collapse tabular-nums">
                <caption className="pb-1 text-left font-semibold">COBRANZAS</caption>
                <tbody>
                  {r.cobranzas.map((c) => (
                    <tr key={c.id} className="border-b border-texto/20">
                      <td className="py-0.5">{c.numero}</td>
                      <td className="py-0.5">{c.cliente}</td>
                      <td className="py-0.5">{c.documento}</td>
                      <td className="py-0.5">{etiquetaFormaPago(c.forma_pago)}</td>
                      <td className="py-0.5 text-right">{formatoMonto(c.importe)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={4} className="py-1">
                      TOTAL COBRANZAS
                    </td>
                    <td className="py-1 text-right">{formatoMonto(r.arqueo.cobranzas)}</td>
                  </tr>
                </tbody>
              </table>
              {r.devoluciones.length > 0 && (
                <table className="w-full border-collapse tabular-nums">
                  <caption className="pb-1 text-left font-semibold">DEVOLUCIONES</caption>
                  <tbody>
                    {r.devoluciones.map((d) => (
                      <tr key={d.id} className="border-b border-texto/20">
                        <td className="py-0.5">{d.numero}</td>
                        <td className="py-0.5">{d.nota}</td>
                        <td className="py-0.5">{d.cliente}</td>
                        <td className="py-0.5">{d.tipo_reverso === 'reembolso' ? 'Reembolso' : 'Abono a cuenta'}</td>
                        <td className="py-0.5 text-right">{formatoMonto(d.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      )}
    </PrintLayout>
  )
}
