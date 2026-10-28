import { useNavigate } from 'react-router-dom'
import { CalendarClock, History } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { useHoy } from '@/core/fecha/useHoy'
import type { EstadoLiquidacion, FiltrosLiquidaciones, Liquidacion } from '@/core/models/liquidacion'
import { POR_PAGINA } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFecha, formatoFechaHora } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { BotonEnlace } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useHistorialLiquidaciones } from './liquidacion.queries'

const FILTROS = { desde: '', hasta: '', estado: '', pagina: '1' }

const monto = (valor: number | null) => (valor === null ? <span className="text-texto-3">—</span> : <MontoBs valor={valor} />)

// Historial de liquidaciones (06-pantallas/09 §6): los totales se guardan al
// cerrar, así que los días abiertos no tienen. Arriba, los días pendientes
// (salen de los avisos del shell: sin otro request).
export default function HistorialLiquidacionPage() {
  const hoy = useHoy()
  const navigate = useNavigate()
  const { regionalActiva, regionalActivaId, opciones } = useRegionalActiva()
  const avisos = useAvisos()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosLiquidaciones = { desde: f.desde, hasta: f.hasta, estado: f.estado as EstadoLiquidacion | '' }
  const consulta = useHistorialLiquidaciones(regionalActivaId, filtros, pagina)
  const pendientes = avisos.data?.dias_pendientes ?? []
  const codigo = (id: string) => opciones.find((r) => r.id === id)?.codigo ?? ''

  const columnas: Columna<Liquidacion>[] = [
    { clave: 'fecha', titulo: 'Fecha', principalMovil: true, numerico: true, render: (l) => <DosLineas principal={<span className="font-medium">{formatoFecha(l.fecha)}</span>} secundario={regionalActiva ? undefined : l.regional_codigo} /> },
    { clave: 'estado', titulo: 'Estado', render: (l) => <EstadoBadge estado={l.estado} /> },
    { clave: 'ventas', titulo: 'Total ventas', alinear: 'der', render: (l) => monto(l.total_ventas) },
    {
      clave: 'contado',
      titulo: 'Contado',
      alinear: 'der',
      ocultarEnMovil: true,
      render: (l) => monto(l.total_contado_bruto === null ? null : redondear(l.total_contado_bruto - (l.descuento_contado ?? 0))),
    },
    {
      clave: 'credito',
      titulo: 'Crédito',
      alinear: 'der',
      ocultarEnMovil: true,
      render: (l) => monto(l.total_credito_bruto === null ? null : redondear(l.total_credito_bruto - (l.descuento_credito ?? 0))),
    },
    { clave: 'cobranzas', titulo: 'Cobranzas', alinear: 'der', ocultarEnMovil: true, render: (l) => monto(l.total_cobranzas) },
    { clave: 'efectivo', titulo: 'Total efectivo', alinear: 'der', render: (l) => monto(l.total_efectivo) },
    {
      clave: 'cierre',
      titulo: 'Cerrado por',
      ocultarEnMovil: true,
      render: (l) => (l.cerrada_por_nombre ? <DosLineas principal={l.cerrada_por_nombre} secundario={formatoFechaHora(l.cerrada_en)} /> : <span className="text-texto-3">—</span>),
    },
  ]

  return (
    <Pagina titulo="Historial de liquidaciones" subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}>
      {pendientes.length > 0 && (
        <Card titulo="Días pendientes de cierre" icono={CalendarClock} tono="alerta">
          <div className="flex flex-wrap gap-2">
            {pendientes.map((d) => (
              <BotonEnlace key={`${d.regional_id}-${d.fecha}`} a={`/liquidacion/${d.fecha}?regional=${d.regional_id}`} tam="sm">
                {regionalActiva ? '' : `${codigo(d.regional_id)} · `}
                {formatoFecha(d.fecha)}
                {d.notas_sin_factura > 0 && ` · ${d.notas_sin_factura} sin factura`}
              </BotonEnlace>
            ))}
          </div>
        </Card>
      )}
      <Card sinPadding>
        <BarraFiltros>
          <FiltroFechas desde={f.desde} hasta={f.hasta} max={hoy} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
          <FiltroSelect
            etiqueta="Estado"
            valor={f.estado}
            alCambiar={(estado) => cambiar({ estado })}
            opciones={[
              { valor: '', etiqueta: 'Abiertos y cerrados' },
              { valor: 'abierta', etiqueta: 'Abiertos' },
              { valor: 'cerrada', etiqueta: 'Cerrados' },
            ]}
          />
        </BarraFiltros>
        <SeccionConsulta consulta={consulta}>
          {(datos) => (
            <>
              <Tabla
                etiqueta="Liquidaciones"
                columnas={columnas}
                filas={datos.filas}
                claveFila={(l) => l.id}
                alClicFila={(l) => navigate(`/liquidacion/${l.fecha}?regional=${l.regional_id}`)}
                vacio={<EmptyState icono={History} titulo="No hay liquidaciones con esos filtros" />}
              />
              <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="días" alCambiar={(p) => cambiar({ pagina: String(p) })} />
            </>
          )}
        </SeccionConsulta>
      </Card>
    </Pagina>
  )
}
