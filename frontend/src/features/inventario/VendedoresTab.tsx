import { Truck } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { SaldoVendedor } from '@/core/models/inventario'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoCantidad } from '@/shared/format/cantidad'
import { inicioDeMes } from '@/shared/format/fecha'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros } from '@/shared/ui/FiltroSelect'
import { BotonExcel } from '@/shared/ui/BotonExcel'
import { exportarTabla, nombreExport } from '@/shared/export/excelTabla'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useSaldoVendedores } from './inventario.queries'

const FILTROS = { desde: '', hasta: '' }

const cifra = (valor: number) => (valor ? formatoCantidad(valor) : <span className="text-texto-3">—</span>)

const COLUMNAS: Columna<SaldoVendedor>[] = [
  { clave: 'producto', titulo: 'Producto', principalMovil: true, render: (s) => s.producto },
  { clave: 'inicial', titulo: 'Saldo inicial', alinear: 'der', numerico: true, render: (s) => cifra(s.saldo_inicial) },
  { clave: 'entregado', titulo: 'Entregado', alinear: 'der', numerico: true, render: (s) => cifra(s.entregado) },
  { clave: 'vendido', titulo: 'Vendido', alinear: 'der', numerico: true, render: (s) => cifra(s.vendido) },
  { clave: 'retornado', titulo: 'Retornado', alinear: 'der', numerico: true, render: (s) => cifra(s.retornado) },
  { clave: 'saldo', titulo: 'Saldo', alinear: 'der', numerico: true, render: (s) => <span className="font-semibold">{formatoCantidad(s.saldo_final)}</span> },
  { clave: 'valorizado', titulo: 'Valorizado', alinear: 'der', render: (s) => <MontoBs valor={s.valorizado} /> },
]

function agruparPorVendedor(filas: SaldoVendedor[]) {
  const grupos = new Map<string, { vendedor: string; filas: SaldoVendedor[]; valorizado: number }>()
  for (const f of filas) {
    const g = grupos.get(f.vendedor_id) ?? { vendedor: f.vendedor, filas: [], valorizado: 0 }
    g.filas.push(f)
    g.valorizado += f.valorizado
    grupos.set(f.vendedor_id, g)
  }
  return [...grupos.entries()]
}

// Saldo en poder de vendedores (06-pantallas/06 §4, Reglas §7.1). Período por
// defecto: el mes en curso. Un bloque por vendedor, con su total valorizado.
export default function VendedoresTab() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const desde = f.desde || inicioDeMes(hoy)
  const hasta = f.hasta || hoy
  const consulta = useSaldoVendedores(regionalActivaId, desde, hasta)

  return (
    <>
      <BarraFiltros>
        <FiltroFechas etiqueta="Período" desde={desde} hasta={hasta} max={hoy} resaltar={Boolean(f.desde)} alCambiar={(d, h) => cambiar({ desde: d, hasta: h })} />
        <div className="sm:ml-auto">
          <BotonExcel
            tam="sm"
            disabled={!consulta.data?.length}
            alExportar={() =>
              exportarTabla({
                titulo: `Mercadería en poder de vendedores · ${regionalActiva?.nombre ?? 'Todas las regionales'} · ${desde} a ${hasta}`,
                nombre: nombreExport('SaldoVendedores', regionalActiva?.codigo, desde, hasta),
                filas: consulta.data ?? [],
                columnas: [
                  { titulo: 'Vendedor', valor: (s) => s.vendedor },
                  { titulo: 'Producto', valor: (s) => s.producto },
                  { titulo: 'Saldo inicial', formato: 'cantidad', valor: (s) => s.saldo_inicial },
                  { titulo: 'Entregado', formato: 'cantidad', valor: (s) => s.entregado },
                  { titulo: 'Vendido', formato: 'cantidad', valor: (s) => s.vendido },
                  { titulo: 'Retornado', formato: 'cantidad', valor: (s) => s.retornado },
                  { titulo: 'Saldo', formato: 'cantidad', valor: (s) => s.saldo_final },
                  { titulo: 'Valorizado', formato: 'monto', valor: (s) => s.valorizado },
                ],
              })
            }
          />
        </div>
      </BarraFiltros>
      <SeccionConsulta consulta={consulta}>
        {(filas) =>
          filas.length ? (
            agruparPorVendedor(filas).map(([id, g]) => (
              <section key={id} aria-labelledby={`vendedor-${id}`} className="border-b border-borde last:border-b-0">
                <header className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-4 pb-1">
                  <h3 id={`vendedor-${id}`} className="text-medio font-semibold">
                    {g.vendedor}
                  </h3>
                  <span className="text-chico text-texto-3">
                    En su poder <MontoBs valor={g.valorizado} className="font-semibold text-texto" />
                  </span>
                </header>
                <Tabla etiqueta={`Mercadería de ${g.vendedor}`} columnas={COLUMNAS} filas={g.filas} claveFila={(s) => s.producto_id} />
              </section>
            ))
          ) : (
            <EmptyState icono={Truck} titulo="No hay mercadería en poder de vendedores" />
          )
        }
      </SeccionConsulta>
    </>
  )
}
