import { ChartColumn, Printer } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { IngresoVendedor } from '@/core/models/cobranzas'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { exportarTabla, nombreExport } from '@/shared/export/excelTabla'
import { formatoFechaCorta, inicioDeMes } from '@/shared/format/fecha'
import { BotonExcel } from '@/shared/ui/BotonExcel'
import { redondear } from '@/shared/format/moneda'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros } from '@/shared/ui/FiltroSelect'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useIngresosVendedores } from './cobranzas.queries'

const FILTROS = { desde: '', hasta: '' }

const monto = (valor: number) => (valor ? <MontoBs valor={valor} /> : <span className="text-texto-3">—</span>)

// Ingresos y rendimiento por vendedor (06-pantallas/08 §3, Reglas §7.2): una
// pestaña de Reportes. La impresión trae el detalle de notas de cada vendedor (⚠ SUP-55).
export default function RendimientoPage() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const desde = f.desde || inicioDeMes(hoy)
  const hasta = f.hasta || hoy
  const consulta = useIngresosVendedores(regionalActivaId, desde, hasta)

  const imprimir = (vendedorId?: string) => {
    const params = new URLSearchParams({ desde, hasta, ...(regionalActivaId ? { regional: regionalActivaId } : {}), ...(vendedorId ? { vendedor: vendedorId } : {}) })
    window.open(`/imprimir/rendimiento?${params}`, '_blank')
  }

  const columnas: Columna<IngresoVendedor>[] = [
    { clave: 'vendedor', titulo: 'Vendedor', principalMovil: true, render: (v) => <span className="font-medium">{v.vendedor}</span> },
    { clave: 'notas', titulo: 'Notas', alinear: 'der', numerico: true, render: (v) => v.notas || <span className="text-texto-3">—</span> },
    { clave: 'contado', titulo: 'Ventas contado', alinear: 'der', render: (v) => monto(v.ventas_contado) },
    { clave: 'credito', titulo: 'Ventas crédito', alinear: 'der', ocultarEnMovil: true, render: (v) => monto(v.ventas_credito) },
    { clave: 'cobranzas', titulo: 'Cobranzas', alinear: 'der', render: (v) => monto(v.cobranzas) },
    { clave: 'reembolsos', titulo: 'Reembolsos', alinear: 'der', render: (v) => monto(v.reembolsos) },
    { clave: 'ingreso', titulo: 'Ingreso', alinear: 'der', render: (v) => <MontoBs valor={v.ingreso} className="font-semibold" /> },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      acciones: true,
      render: (v) => (
        <BotonIcono etiqueta={`Imprimir el rendimiento de ${v.vendedor}`} onClick={() => imprimir(v.vendedor_id)}>
          <Printer size={15} />
        </BotonIcono>
      ),
    },
  ]

  const exportar = () =>
    exportarTabla({
      titulo: `Rendimiento por vendedor · ${regionalActiva?.nombre ?? 'Todas las regionales'} · ${formatoFechaCorta(desde)}–${formatoFechaCorta(hasta)}`,
      nombre: nombreExport('Rendimiento', regionalActiva?.codigo, desde, hasta),
      filas: consulta.data ?? [],
      columnas: [
        { titulo: 'Vendedor', valor: (v) => v.vendedor },
        { titulo: 'Notas', formato: 'cantidad', valor: (v) => v.notas },
        { titulo: 'Ventas contado', formato: 'monto', valor: (v) => v.ventas_contado },
        { titulo: 'Ventas crédito', formato: 'monto', valor: (v) => v.ventas_credito },
        { titulo: 'Cobranzas', formato: 'monto', valor: (v) => v.cobranzas },
        { titulo: 'Reembolsos', formato: 'monto', valor: (v) => v.reembolsos },
        { titulo: 'Ingreso', formato: 'monto', valor: (v) => v.ingreso },
      ],
    })

  return (
    <>
      <BarraFiltros>
        <FiltroFechas etiqueta="Período" desde={desde} hasta={hasta} max={hoy} resaltar={Boolean(f.desde)} alCambiar={(d, h) => cambiar({ desde: d, hasta: h })} />
        <div className="flex gap-2 sm:ml-auto">
          <Button variante="secundario" tam="sm" icono={<Printer size={14} />} disabled={!consulta.data?.length} onClick={() => imprimir()}>
            Imprimir
          </Button>
          <BotonExcel tam="sm" disabled={!consulta.data?.length} alExportar={exportar} />
        </div>
      </BarraFiltros>
      <SeccionConsulta consulta={consulta}>
        {(filas) => (
          <>
            <Tabla etiqueta="Rendimiento por vendedor" columnas={columnas} filas={filas} claveFila={(v) => v.vendedor_id} vacio={<EmptyState icono={ChartColumn} titulo="Sin movimiento en el período" />} />
            {filas.length > 0 && (
              <p className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-borde px-4 py-3 text-chico text-texto-3">
                <span>
                  Cobranzas <MontoBs valor={redondear(filas.reduce((t, v) => t + v.cobranzas, 0))} className="text-texto" />
                </span>
                <span>
                  Ingreso total <MontoBs valor={redondear(filas.reduce((t, v) => t + v.ingreso, 0))} className="font-semibold text-texto" />
                </span>
              </p>
            )}
          </>
        )}
      </SeccionConsulta>
    </>
  )
}
