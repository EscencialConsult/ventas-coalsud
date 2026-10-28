import { useParams, useSearchParams } from 'react-router-dom'
import { EMPRESA } from '@/core/empresa'
import { mapearError } from '@/core/errores/mapearError'
import type { HojaCarga } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'
import { HojaA4, PrintLayout } from '@/shared/print/PrintLayout'
import { Alerta, Skeleton } from '@/shared/ui/Estados'
import { useHojaCarga } from '../notas.queries'

/** Productos agrupados por línea, en el orden en que llegan. */
function porLinea(productos: HojaCarga['productos']) {
  const grupos = new Map<string, HojaCarga['productos']>()
  for (const p of productos) grupos.set(p.linea, [...(grupos.get(p.linea) ?? []), p])
  return [...grupos.entries()]
}

function Hoja({ hoja, regional, fecha }: { hoja: HojaCarga; regional: string; fecha: string }) {
  return (
    <HojaA4 className="min-h-[297mm] p-[12mm] text-chico">
      <header className="flex items-end justify-between gap-4 border-b border-texto pb-2">
        <div>
          <p className="font-marca text-subtitulo font-extrabold">{EMPRESA.razonSocial}</p>
          <p className="text-medio font-bold">HOJA DE CARGA</p>
        </div>
        <p className="text-right tabular-nums">
          {regional} · {formatoFecha(fecha)}
          <br />
          Vendedor <b>{hoja.vendedor}</b>
        </p>
      </header>

      <table className="mt-3 w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-b border-texto text-left">
            <th className="py-1 font-semibold">Producto</th>
            <th className="py-1 text-right font-semibold">Cantidad</th>
            <th className="py-1 text-right font-semibold">Bs</th>
          </tr>
        </thead>
        {porLinea(hoja.productos).map(([linea, productos]) => (
          <tbody key={linea}>
            <tr>
              <th colSpan={3} className="pt-2 pb-0.5 text-left text-mini font-semibold tracking-wide text-texto-2 uppercase">
                {linea}
              </th>
            </tr>
            {productos.map((p) => (
              <tr key={p.producto_id} className="border-b border-borde">
                <td className="py-0.5">{p.producto}</td>
                <td className="py-0.5 text-right">{formatoCantidad(p.cantidad)}</td>
                <td className="py-0.5 text-right">{formatoMonto(p.bs)}</td>
              </tr>
            ))}
          </tbody>
        ))}
        <tfoot>
          <tr className="border-t border-texto font-bold">
            <td className="py-1">Total</td>
            <td className="py-1 text-right">{formatoCantidad(hoja.totales.unidades)} u.</td>
            <td className="py-1 text-right">{formatoMonto(hoja.totales.neto)}</td>
          </tr>
        </tfoot>
      </table>

      <h2 className="mt-4 font-semibold">Notas ({hoja.notas.length})</h2>
      <ul className="mt-1 grid gap-0.5 tabular-nums">
        {hoja.notas.map((n) => (
          <li key={n.id} className="flex gap-3">
            <b className="w-20 shrink-0">{n.numero}</b>
            <span className="min-w-0 flex-1">
              {n.cliente}
              {n.zona && ` (${n.zona})`}
            </span>
            <span className="text-texto-2">{n.condicion}</span>
            <span className="w-24 text-right">Bs {formatoMonto(n.total)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-16 grid grid-cols-2 gap-16 px-8 text-center">
        <p className="border-t border-texto pt-1">Entregué (almacén)</p>
        <p className="border-t border-texto pt-1">Recibí conforme (vendedor)</p>
      </div>
    </HojaA4>
  )
}

// /imprimir/hoja-carga/:fecha?vendedor=&regional= — una página por vendedor
// (07-Impresion §3, RF42). Las anuladas no cuentan.
export default function ImprimirHojaCargaPage() {
  const { fecha = '' } = useParams()
  const [params] = useSearchParams()
  const regionalId = params.get('regional') || null
  const { opciones } = useRegionalActiva()
  const consulta = useHojaCarga(regionalId, fecha, params.get('vendedor') || null)
  const regional = opciones.find((r) => r.id === regionalId)?.nombre ?? 'Todas las regionales'

  return (
    <PrintLayout titulo={`Hoja de carga · ${formatoFecha(fecha)}`} listo={Boolean(consulta.data?.length)}>
      {consulta.isError && (
        <Alerta tipo="error" className="w-[210mm] max-w-full">
          {mapearError(consulta.error).message}
        </Alerta>
      )}
      {consulta.isPending && <Skeleton className="h-[297mm] w-[210mm] max-w-full" />}
      {consulta.data?.length === 0 && <Alerta className="w-[210mm] max-w-full">No hay notas para cargar ese día.</Alerta>}
      {consulta.data?.map((h) => (
        <Hoja key={h.vendedor_id} hoja={h} regional={regional} fecha={fecha} />
      ))}
    </PrintLayout>
  )
}
