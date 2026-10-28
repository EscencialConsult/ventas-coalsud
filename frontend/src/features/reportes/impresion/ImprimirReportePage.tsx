import { useQuery } from '@tanstack/react-query'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { EMPRESA } from '@/core/empresa'
import { mapearError } from '@/core/errores/mapearError'
import type { CategoriaCliente } from '@/core/models/maestros'
import type { FiltrosReporte } from '@/core/models/reportes'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { MatrizLiquidacion } from '@/features/liquidacion/components/MatrizLiquidacion'
import { PieMovimiento } from '../components/PieMovimiento'
import { formatoFecha } from '@/shared/format/fecha'
import { HojaA4, PrintLayout } from '@/shared/print/PrintLayout'
import { cn } from '@/shared/ui/cn'
import { Alerta } from '@/shared/ui/Estados'
import { REPORTES, type DefinicionReporte } from '../reportes.definiciones'
import { textoCelda } from '../reportes.formato'
import { reportesService } from '../reportes.service'

function Encabezado({ titulo, regional, f }: { titulo: string; regional: string; f: FiltrosReporte }) {
  return (
    <header className="mb-3 flex items-end justify-between gap-4 border-b border-texto pb-2">
      <div>
        <p className="font-marca text-subtitulo font-extrabold">{EMPRESA.razonSocial}</p>
        <p className="text-medio font-bold uppercase">{titulo}</p>
      </div>
      <p className="text-right tabular-nums">
        {regional}
        <br />
        {formatoFecha(f.desde)} – {formatoFecha(f.hasta)}
      </p>
    </header>
  )
}

function HojaReporte<F>({ def, regionalId, regional, f }: { def: DefinicionReporte<F>; regionalId: string | null; regional: string; f: FiltrosReporte }) {
  const consulta = useQuery(def.consulta(def.sinRegional ? null : regionalId, f))
  const filas = consulta.data ?? []
  const columnas = def.columnas(filas)
  return (
    <PrintLayout titulo={def.titulo} listo={Boolean(consulta.data)}>
      {consulta.isError && <Alerta tipo="error">{mapearError(consulta.error).message}</Alerta>}
      {consulta.data && (
        <HojaA4 className="min-h-[297mm] p-[12mm] text-chico">
          <Encabezado titulo={def.titulo} regional={def.sinRegional ? 'Todas las regionales' : regional} f={f} />
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-y border-texto">
                {columnas.map((c) => (
                  <th key={c.clave} className={cn('py-1 font-semibold', c.formato === 'texto' ? 'text-left' : 'text-right')}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={def.claveFila(fila)} className="border-b border-borde">
                  {columnas.map((c) => (
                    <td key={c.clave} className={cn('py-0.5', c.formato !== 'texto' && 'text-right')}>
                      {textoCelda(c.formato, c.valor(fila))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!filas.length && <p className="mt-2 text-texto-2">Sin datos en el período.</p>}
        </HojaA4>
      )}
    </PrintLayout>
  )
}

function HojaMovimiento({ regionalId, regional, f }: { regionalId: string; regional: string; f: FiltrosReporte }) {
  const consulta = useQuery({ queryKey: ['reportes', 'movimiento', regionalId, f.desde, f.hasta], queryFn: ({ signal }) => reportesService.movimientoPeriodo(regionalId, f, { signal }) })
  return (
    <PrintLayout titulo="Movimiento por período" listo={Boolean(consulta.data)}>
      {consulta.isError && <Alerta tipo="error">{mapearError(consulta.error).message}</Alerta>}
      {consulta.data && (
        <section className="w-[297mm] bg-fondo p-[8mm] text-mini text-texto shadow-card [page:horizontal] print:w-auto print:p-0 print:shadow-none">
          <Encabezado titulo="Movimiento por período" regional={regional} f={f} />
          <MatrizLiquidacion reporte={consulta.data} impresion />
          <PieMovimiento pie={consulta.data.pie} />
        </section>
      )}
    </PrintLayout>
  )
}

// /imprimir/reporte/:clave — los mismos filtros de la pantalla, en la URL.
export default function ImprimirReportePage() {
  const { clave } = useParams()
  const [params] = useSearchParams()
  const { opciones } = useRegionalActiva()
  const regionalId = params.get('regional') || null
  const regional = opciones.find((r) => r.id === regionalId)?.nombre ?? 'Todas las regionales'
  const f: FiltrosReporte = {
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
    vendedorId: params.get('vendedor') ?? '',
    lineaId: params.get('linea') ?? '',
    categoria: (params.get('categoria') ?? '') as CategoriaCliente | '',
  }
  const comunes = { regionalId, regional, f }
  switch (clave) {
    case 'clientes':
      return <HojaReporte def={REPORTES.clientes} {...comunes} />
    case 'productos':
      return <HojaReporte def={REPORTES.productos} {...comunes} />
    case 'rotacion':
      return <HojaReporte def={REPORTES.rotacion} {...comunes} />
    case 'regionales':
      return <HojaReporte def={REPORTES.regionales} {...comunes} />
    case 'movimiento':
      return regionalId ? <HojaMovimiento regionalId={regionalId} regional={regional} f={f} /> : <Navigate to="/reportes/movimiento" replace />
    default:
      return <Navigate to="/reportes" replace />
  }
}
