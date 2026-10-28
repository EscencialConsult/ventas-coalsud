import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EMPRESA } from '@/core/empresa'
import { mapearError } from '@/core/errores/mapearError'
import type { CategoriaCliente } from '@/core/models/maestros'
import { etiquetaCategoria } from '@/features/clientes/clientes.opciones'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'
import { PrintLayout } from '@/shared/print/PrintLayout'
import { Alerta } from '@/shared/ui/Estados'
import { TablaEecc } from '../components/TablaEecc'
import { eeccService } from '../eecc.service'

// /imprimir/eecc?fecha&regional&categoria — A4 horizontal con el encabezado
// de F4/F5 y un bloque por regional y categoría.
export default function ImprimirEeccPage() {
  const [params] = useSearchParams()
  const corte = params.get('fecha') ?? ''
  const regionalId = params.get('regional') || null
  const categoria = (params.get('categoria') ?? '') as CategoriaCliente | ''
  const consulta = useQuery({ queryKey: ['eecc', corte, regionalId, categoria], queryFn: ({ signal }) => eeccService.consolidado(corte, regionalId, categoria, { signal }) })
  const e = consulta.data

  return (
    <PrintLayout titulo={`EECC al ${formatoFecha(corte)}`} listo={Boolean(e)}>
      {consulta.isError && <Alerta tipo="error">{mapearError(consulta.error).message}</Alerta>}
      {e && (
        <section className="w-[297mm] bg-fondo p-[8mm] text-mini text-texto shadow-card [page:horizontal] print:w-auto print:p-0 print:shadow-none">
          <header className="mb-3 text-center">
            <p className="font-marca text-subtitulo font-extrabold">{EMPRESA.razonSocial}</p>
            <p>
              NIT {EMPRESA.nit} · {EMPRESA.direccion}
            </p>
            <p className="mt-2 text-medio font-bold">ESTADO DE CUENTAS POR COBRAR - {categoria ? etiquetaCategoria(categoria).toUpperCase() : 'CONSOLIDADO'}</p>
            <p className="font-semibold">AL {formatoFecha(corte)} · (Expresado en Bolivianos)</p>
          </header>
          <div className="grid gap-4">
            {e.grupos.map((g) => (
              <div key={`${g.regional}-${g.categoria}`} className="break-inside-avoid">
                <TablaEecc eecc={e} grupo={g} impresion />
              </div>
            ))}
          </div>
          <p className="mt-4 flex justify-between border-t border-texto pt-1 font-bold tabular-nums">
            <span>SALDO ACTUAL</span>
            <span>{formatoMonto(e.total_general.total ?? 0)}</span>
          </p>
        </section>
      )}
    </PrintLayout>
  )
}
