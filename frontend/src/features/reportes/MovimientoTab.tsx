import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChartColumn, Printer } from 'lucide-react'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { MatrizLiquidacion } from '@/features/liquidacion/components/MatrizLiquidacion'
import { columnasMatriz } from '@/features/liquidacion/liquidacion.columnas'
import { exportarTabla, nombreExport } from '@/shared/export/excelTabla'
import { formatoFechaCorta } from '@/shared/format/fecha'
import { BotonExcel } from '@/shared/ui/BotonExcel'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { parametrosImpresion } from './reportes.formato'
import { reportesService } from './reportes.service'
import { useFiltrosReporte } from './useFiltrosReporte'

// Movimiento por período (⚠ SUP-54): la matriz de la liquidación acumulada en
// el rango, para el cuadre de fin de mes. Por regional.
export default function MovimientoTab() {
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const { filtros, crudos, cambiar, hoy } = useFiltrosReporte()
  const [completo, setCompleto] = useState(false)
  const consulta = useQuery({
    queryKey: ['reportes', 'movimiento', regionalActivaId, filtros.desde, filtros.hasta],
    queryFn: ({ signal }) => reportesService.movimientoPeriodo(regionalActivaId ?? '', filtros, { signal }),
    enabled: regionalActivaId !== null,
  })

  const exportar = async () => {
    const datos = consulta.data
    if (!datos) return
    const filas = datos.lineas.flatMap((l) => l.productos.map((p) => ({ ...p, linea: l.linea })))
    await exportarTabla({
      titulo: `Movimiento por período · ${regionalActiva?.nombre ?? ''} · ${formatoFechaCorta(filtros.desde)}–${formatoFechaCorta(filtros.hasta)}`,
      nombre: nombreExport('Movimiento', regionalActiva?.codigo, filtros.desde, filtros.hasta),
      filas,
      columnas: [
        { titulo: 'Línea', valor: (f) => f.linea },
        { titulo: 'Producto', valor: (f) => f.producto },
        ...columnasMatriz(datos.columnas_extra).map((c) => ({
          titulo: c.grupo ? `${c.grupo} ${c.titulo}` : c.titulo,
          formato: c.formato === 'monto' ? ('monto' as const) : ('cantidad' as const),
          valor: (f: (typeof filas)[number]) => f[c.clave],
        })),
      ],
    })
  }

  return (
    <>
      <BarraFiltros>
        <FiltroFechas etiqueta="Período" desde={filtros.desde} hasta={filtros.hasta} max={hoy} resaltar={Boolean(crudos.desde)} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
        <Interruptor activo={completo} etiqueta="Mostrar catálogo completo" texto="Catálogo completo" alCambiar={setCompleto} />
        <div className="flex gap-2 sm:ml-auto">
          <Button
            variante="secundario"
            tam="sm"
            icono={<Printer size={14} />}
            disabled={!consulta.data}
            onClick={() => window.open(`/imprimir/reporte/movimiento?${parametrosImpresion(regionalActivaId, crudos, filtros.desde, filtros.hasta)}`, '_blank')}
          >
            Imprimir
          </Button>
          <BotonExcel tam="sm" disabled={!consulta.data} alExportar={exportar} />
        </div>
      </BarraFiltros>
      {regionalActivaId === null ? (
        <EmptyState icono={ChartColumn} titulo="Elija una regional" detalle="El movimiento por período se calcula por regional: elíjala arriba, en el selector." />
      ) : (
        <SeccionConsulta consulta={consulta}>{(datos) => <MatrizLiquidacion reporte={datos} completo={completo} />}</SeccionConsulta>
      )}
    </>
  )
}
