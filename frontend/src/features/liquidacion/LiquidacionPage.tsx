import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Calculator, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { formatoFechaHora, sumarDias } from '@/shared/format/fecha'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { BotonEnlace } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { Alerta, EmptyState, Skeleton } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Segmentado } from '@/shared/ui/Segmentado'
import { AccionesDia } from './components/AccionesDia'
import { CobranzasDia, DetalleNotasDia, DevolucionesDia } from './components/BloquesDia'
import { CajaArqueo } from './components/CajaArqueo'
import { CobranzasDiaTab } from './components/CobranzasDiaTab'
import { MatrizLiquidacion } from './components/MatrizLiquidacion'
import { useReporteLiquidacion } from './liquidacion.queries'

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

// Liquidación diaria (06-pantallas/09): replica la planilla F3. El reporte es
// por regional; con "Todas", el nacional elige una acá (no cambia el topbar).
export default function LiquidacionPage() {
  const { fecha = '' } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const hoy = useHoy()
  const [params, setParams] = useSearchParams()
  const { regionalActivaId, opciones } = useRegionalActiva()
  const regionalId = regionalActivaId ?? params.get('regional') ?? (opciones.length === 1 ? opciones[0].id : null)
  const pestana = params.get('pestana') === 'cobranzas' ? 'cobranzas' : 'reporte'
  const fechaValida = FECHA_VALIDA.test(fecha) && fecha <= hoy
  const consulta = useReporteLiquidacion(fechaValida ? regionalId : null, fecha)
  const [completo, setCompleto] = useState(false)
  const r = consulta.data

  if (!fechaValida) return <Navigate to={`/liquidacion/${hoy}${search}`} replace />

  const irA = (dia: string) => navigate(`/liquidacion/${dia}${search}`)
  const cambiarParam = (clave: string, valor: string) =>
    setParams((previos) => {
      const siguientes = new URLSearchParams(previos)
      if (valor) siguientes.set(clave, valor)
      else siguientes.delete(clave)
      return siguientes
    })

  return (
    <Pagina
      titulo="Liquidación diaria"
      subtitulo={
        r && (
          <span className="flex flex-wrap items-center gap-2">
            {r.regional.nombre} · consolida a todos los vendedores <EstadoBadge estado={r.estado === 'cerrada' ? 'cerrada' : 'abierta'} />
          </span>
        )
      }
      acciones={r && <AccionesDia reporte={r} />}
    >
      <Card sinPadding>
        <BarraFiltros>
          <div className="flex items-center gap-1">
            <BotonIcono etiqueta="Día anterior" onClick={() => irA(sumarDias(fecha, -1))}>
              <ChevronLeft size={16} />
            </BotonIcono>
            <FiltroFechas modo="dia" etiqueta="Fecha" desde={fecha} hasta={fecha} max={hoy} resaltar={false} alCambiar={(dia) => dia && irA(dia)} />
            <BotonIcono etiqueta="Día siguiente" disabled={fecha >= hoy} onClick={() => irA(sumarDias(fecha, 1))}>
              <ChevronRight size={16} />
            </BotonIcono>
          </div>
          {!regionalActivaId && opciones.length > 1 && (
            <FiltroSelect etiqueta="Regional" valor={regionalId ?? ''} alCambiar={(id) => cambiarParam('regional', id)} opciones={[{ valor: '', etiqueta: 'Elija una regional' }, ...opciones.map((o) => ({ valor: o.id, etiqueta: o.nombre }))]} />
          )}
          {r && (
            <Segmentado
              etiqueta="Secciones de la liquidación"
              valor={pestana}
              alCambiar={(p) => cambiarParam('pestana', p === 'cobranzas' ? 'cobranzas' : '')}
              opciones={[
                { valor: 'reporte', etiqueta: 'Reporte del día' },
                { valor: 'cobranzas', etiqueta: `Cobranzas (${r.cobranzas.length})` },
              ]}
            />
          )}
          {r && pestana === 'reporte' && (
            <Interruptor activo={completo} etiqueta="Mostrar catálogo completo" texto="Catálogo completo" alCambiar={setCompleto} />
          )}
          <BotonEnlace a="/liquidacion/historial" tam="sm" className="sm:ml-auto" icono={<History size={14} />}>
            Historial
          </BotonEnlace>
        </BarraFiltros>

        {!regionalId ? (
          <EmptyState icono={Calculator} titulo="Elija una regional" detalle="El reporte del día es por regional." />
        ) : (
          <SeccionConsulta consulta={consulta} cargando={<Skeleton className="m-4 h-96" />}>
            {(rep) => (
              <>
                {rep.estado === 'cerrada' && (
                  <div className="px-4 pt-4">
                    <Alerta tipo="ok">
                      Cerrado por {rep.cerrada_por} el {formatoFechaHora(rep.cerrada_en)}. Todo el día queda en solo lectura.
                    </Alerta>
                  </div>
                )}
                {pestana === 'cobranzas' ? (
                  <CobranzasDiaTab regionalId={rep.regional.id} fecha={fecha} abierta={rep.estado === 'abierta'} />
                ) : (
                  <>
                    <CajaArqueo arqueo={rep.arqueo} variante="franja" />
                    <MatrizLiquidacion reporte={rep} completo={completo} />
                  </>
                )}
              </>
            )}
          </SeccionConsulta>
        )}
      </Card>

      {r && pestana === 'reporte' && (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <DetalleNotasDia reporte={r} />
            <CobranzasDia reporte={r} />
          </div>
          <DevolucionesDia reporte={r} />
        </>
      )}
    </Pagina>
  )
}
