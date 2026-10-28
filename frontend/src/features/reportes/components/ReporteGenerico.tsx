import { useQuery } from '@tanstack/react-query'
import { ChartColumn, Printer } from 'lucide-react'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useLineas } from '@/features/catalogo/catalogo.queries'
import { CATEGORIAS } from '@/features/clientes/clientes.opciones'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { exportarTabla, nombreExport } from '@/shared/export/excelTabla'
import { formatoFechaCorta } from '@/shared/format/fecha'
import { BotonExcel } from '@/shared/ui/BotonExcel'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import type { DefinicionReporte } from '../reportes.definiciones'
import { parametrosImpresion, textoCelda } from '../reportes.formato'
import { useFiltrosReporte } from '../useFiltrosReporte'

// Pestaña de un reporte genérico: filtros en la URL, tabla, Imprimir y Excel (RF29).
export function ReporteGenerico<F>({ clave, def }: { clave: string; def: DefinicionReporte<F> }) {
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const { filtros, crudos, cambiar, hoy } = useFiltrosReporte()
  const regionalId = def.sinRegional ? null : regionalActivaId
  const falta = def.porRegional && !regionalId
  const consulta = useQuery({ ...def.consulta(regionalId, filtros), enabled: !falta })
  const vendedores = useVendedores(regionalActivaId, def.filtros.includes('vendedor'))
  const lineas = useLineas()
  const filas = consulta.data ?? []
  const definiciones = def.columnas(filas)
  const columnas: Columna<F>[] = definiciones.map((c) => ({
    clave: c.clave,
    titulo: c.titulo,
    principalMovil: c.principal,
    ocultarEnMovil: c.ocultarEnMovil,
    alinear: c.formato === 'texto' ? 'izq' : 'der',
    numerico: c.formato !== 'texto',
    render: (f) => (c.principal ? <span className="font-medium">{textoCelda(c.formato, c.valor(f))}</span> : textoCelda(c.formato, c.valor(f))),
  }))
  const titulo = `${def.titulo} · ${def.sinRegional ? 'Todas las regionales' : (regionalActiva?.nombre ?? 'Todas las regionales')} · ${formatoFechaCorta(filtros.desde)}–${formatoFechaCorta(filtros.hasta)}`

  return (
    <>
      <BarraFiltros>
        <FiltroFechas etiqueta="Período" desde={filtros.desde} hasta={filtros.hasta} max={hoy} resaltar={Boolean(crudos.desde)} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
        {def.filtros.includes('vendedor') && (
          <FiltroSelect
            etiqueta="Vendedor"
            valor={crudos.vendedor}
            alCambiar={(vendedor) => cambiar({ vendedor })}
            opciones={[{ valor: '', etiqueta: 'Todos los vendedores' }, ...(vendedores.data ?? []).map((v) => ({ valor: v.id, etiqueta: v.nombre }))]}
          />
        )}
        {def.filtros.includes('linea') && (
          <FiltroSelect etiqueta="Línea" valor={crudos.linea} alCambiar={(linea) => cambiar({ linea })} opciones={[{ valor: '', etiqueta: 'Todas las líneas' }, ...(lineas.data ?? []).map((l) => ({ valor: l.id, etiqueta: l.nombre }))]} />
        )}
        {def.filtros.includes('categoria') && (
          <FiltroSelect etiqueta="Categoría" valor={crudos.categoria} alCambiar={(categoria) => cambiar({ categoria })} opciones={[{ valor: '', etiqueta: 'Todas las categorías' }, ...CATEGORIAS]} />
        )}
        <div className="flex gap-2 sm:ml-auto">
          <Button
            variante="secundario"
            tam="sm"
            icono={<Printer size={14} />}
            disabled={!filas.length}
            onClick={() => window.open(`/imprimir/reporte/${clave}?${parametrosImpresion(regionalId, crudos, filtros.desde, filtros.hasta)}`, '_blank')}
          >
            Imprimir
          </Button>
          <BotonExcel
            tam="sm"
            disabled={!filas.length}
            alExportar={() =>
              exportarTabla({ titulo, nombre: nombreExport(def.archivo, def.sinRegional ? null : regionalActiva?.codigo, filtros.desde, filtros.hasta), filas, columnas: definiciones })
            }
          />
        </div>
      </BarraFiltros>
      {falta ? (
        <EmptyState icono={ChartColumn} titulo="Elija una regional" detalle="Este reporte se calcula por regional: elíjala arriba, en el selector." />
      ) : (
        <SeccionConsulta consulta={consulta}>
          {() => <Tabla etiqueta={def.titulo} columnas={columnas} filas={filas} claveFila={def.claveFila} vacio={<EmptyState icono={ChartColumn} titulo="Sin datos en el período" />} />}
        </SeccionConsulta>
      )}
    </>
  )
}
