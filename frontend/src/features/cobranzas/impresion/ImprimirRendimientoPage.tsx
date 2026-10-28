import { useSearchParams } from 'react-router-dom'
import { EMPRESA } from '@/core/empresa'
import { mapearError } from '@/core/errores/mapearError'
import type { IngresoVendedor } from '@/core/models/cobranzas'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'
import { HojaA4, PrintLayout } from '@/shared/print/PrintLayout'
import { cn } from '@/shared/ui/cn'
import { Alerta, Skeleton } from '@/shared/ui/Estados'
import { useIngresosVendedores } from '../cobranzas.queries'

function Hoja({ v, regional, desde, hasta }: { v: IngresoVendedor; regional: string; desde: string; hasta: string }) {
  const resumen: [string, string][] = [
    ['Notas', String(v.notas)],
    ['Ventas contado', `Bs ${formatoMonto(v.ventas_contado)}`],
    ['Ventas crédito', `Bs ${formatoMonto(v.ventas_credito)}`],
    ['Cobranzas', `Bs ${formatoMonto(v.cobranzas)}`],
    ['Reembolsos', `Bs ${formatoMonto(v.reembolsos)}`],
  ]
  return (
    <HojaA4 className="min-h-[297mm] p-[12mm] text-chico">
      <header className="flex items-end justify-between gap-4 border-b border-texto pb-2">
        <div>
          <p className="font-marca text-subtitulo font-extrabold">{EMPRESA.razonSocial}</p>
          <p className="text-medio font-bold">RENDIMIENTO POR VENDEDOR</p>
        </div>
        <p className="text-right tabular-nums">
          {regional} · {formatoFecha(desde)} – {formatoFecha(hasta)}
          <br />
          Vendedor <b>{v.vendedor}</b>
        </p>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-x-6 gap-y-2 tabular-nums">
        {resumen.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="text-texto-2">{etiqueta}</dt>
            <dd className="font-semibold">{valor}</dd>
          </div>
        ))}
        <div>
          <dt className="text-texto-2">Ingreso (contado + cobranzas − reembolsos)</dt>
          <dd className="text-medio font-bold">Bs {formatoMonto(v.ingreso)}</dd>
        </div>
      </dl>

      <h2 className="mt-5 font-semibold">Notas del período</h2>
      <table className="mt-1 w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-y border-texto text-left">
            <th className="py-1 font-semibold">Fecha</th>
            <th className="py-1 font-semibold">N°</th>
            <th className="py-1 font-semibold">Cliente</th>
            <th className="py-1 font-semibold">Condición</th>
            <th className="py-1 text-right font-semibold">Total</th>
            <th className="py-1 pl-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(v.detalle ?? []).map((n) => (
            <tr key={n.id} className={cn('border-b border-borde', n.estado === 'anulada' && 'text-texto-3 line-through')}>
              <td className="py-0.5">{formatoFecha(n.fecha)}</td>
              <td className="py-0.5">{n.numero}</td>
              <td className="py-0.5">{n.cliente}</td>
              <td className="py-0.5">{n.condicion}</td>
              <td className="py-0.5 text-right">{formatoMonto(n.total)}</td>
              <td className="py-0.5 pl-3">{n.estado === 'anulada' ? 'Anulada' : 'Emitida'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!v.detalle?.length && <p className="mt-2 text-texto-2">Sin notas en el período.</p>}
    </HojaA4>
  )
}

// /imprimir/rendimiento?desde&hasta&regional&vendedor — una página por
// vendedor con su resumen y el detalle de notas (07-Impresion §6, ⚠ SUP-55).
export default function ImprimirRendimientoPage() {
  const [params] = useSearchParams()
  const desde = params.get('desde') ?? ''
  const hasta = params.get('hasta') ?? ''
  const regionalId = params.get('regional') || null
  const vendedorId = params.get('vendedor')
  const { opciones } = useRegionalActiva()
  const consulta = useIngresosVendedores(regionalId, desde, hasta, true)
  const hojas = (consulta.data ?? []).filter((v) => !vendedorId || v.vendedor_id === vendedorId)
  const regional = opciones.find((r) => r.id === regionalId)?.nombre ?? 'Todas las regionales'

  return (
    <PrintLayout titulo={`Rendimiento por vendedor · ${formatoFecha(desde)} – ${formatoFecha(hasta)}`} listo={hojas.length > 0}>
      {consulta.isError && (
        <Alerta tipo="error" className="w-[210mm] max-w-full">
          {mapearError(consulta.error).message}
        </Alerta>
      )}
      {consulta.isPending && <Skeleton className="h-[297mm] w-[210mm] max-w-full" />}
      {consulta.data && !hojas.length && <Alerta className="w-[210mm] max-w-full">No hay vendedores con movimiento en el período.</Alerta>}
      {hojas.map((v) => (
        <Hoja key={v.vendedor_id} v={v} regional={regional} desde={desde} hasta={hasta} />
      ))}
    </PrintLayout>
  )
}
