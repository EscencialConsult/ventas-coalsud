import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Printer, Truck } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { useHoy } from '@/core/fecha/useHoy'
import { POR_PAGINA } from '@/core/models/maestros'
import type { CondicionTipo, EstadoNota, FiltrosNotas, NotaVenta } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFecha } from '@/shared/format/fecha'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { BotonEnlace } from '@/shared/ui/Button'
import { CampoBusqueda } from '@/shared/ui/CampoBusqueda'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useNotas } from './notas.queries'
import { imprimirNota } from './notas.rutas'

const FILTROS = { q: '', desde: '', hasta: '', estado: '', vendedor: '', condicion: '', pendiente_factura: '', pagina: '1' }

const COLUMNAS: Columna<NotaVenta>[] = [
  { clave: 'numero', titulo: 'Nota', numerico: true, render: (n) => <DosLineas principal={<span className="font-medium">{n.numero}</span>} secundario={formatoFecha(n.fecha)} /> },
  { clave: 'cliente', titulo: 'Cliente', principalMovil: true, render: (n) => <DosLineas principal={<span className="font-medium">{n.cliente_nombre}</span>} secundario={n.vendedor_nombre} /> },
  {
    clave: 'factura',
    titulo: 'Factura',
    numerico: true,
    render: (n) => (n.pendiente_factura ? <EstadoBadge estado="sin_factura" /> : (n.numero_factura ?? <span className="text-texto-3">—</span>)),
  },
  { clave: 'condicion', titulo: 'Condición', ocultarEnMovil: true, render: (n) => n.condicion_nombre },
  { clave: 'total', titulo: 'Total', alinear: 'der', render: (n) => <MontoBs valor={n.total} /> },
  { clave: 'saldo', titulo: 'Saldo', alinear: 'der', render: (n) => (n.saldo > 0 ? <MontoBs valor={n.saldo} /> : <span className="text-texto-3">—</span>) },
  { clave: 'estado', titulo: 'Estado', render: (n) => <EstadoBadge estado={n.estado} /> },
  {
    clave: 'acciones',
    titulo: 'Acciones',
    acciones: true,
    render: (n) => (
      <BotonIcono etiqueta={`Imprimir ${n.numero}`} onClick={() => imprimirNota(n.id)}>
        <Printer size={15} />
      </BotonIcono>
    ),
  },
]

// Historial de notas (06-pantallas/07 §1): v_nota_venta con filtros en la URL
// y paginación de servidor. La campana llega con `pendiente_factura=1`.
export default function NotasPage() {
  const hoy = useHoy()
  const navigate = useNavigate()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosNotas = {
    q: f.q,
    desde: f.desde,
    hasta: f.hasta,
    estado: f.estado as EstadoNota | '',
    vendedorId: f.vendedor,
    condicion: f.condicion as CondicionTipo | '',
    sinFactura: f.pendiente_factura === '1',
  }
  const consulta = useNotas(regionalActivaId, filtros, pagina)
  const vendedores = useVendedores(regionalActivaId)
  const puedeEmitir = usePermisos()('nota.emitir')

  return (
    <Pagina
      titulo="Notas de venta"
      subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonEnlace a="/notas/hoja-carga" icono={<Truck size={15} />}>
            Hoja de carga
          </BotonEnlace>
          {puedeEmitir && (
            <BotonEnlace a="/notas/nueva" variante="primario" icono={<Plus size={16} />}>
              Nueva nota
            </BotonEnlace>
          )}
        </div>
      }
    >
      <Card sinPadding>
        <BarraFiltros>
          <CampoBusqueda etiqueta="Buscar notas" placeholder="N° de nota, factura o cliente…" valor={f.q} alCambiar={(q) => cambiar({ q }, { reemplazar: true })} />
          <FiltroFechas desde={f.desde} hasta={f.hasta} max={hoy} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
          <FiltroSelect
            etiqueta="Estado"
            valor={f.estado}
            alCambiar={(estado) => cambiar({ estado })}
            opciones={[
              { valor: '', etiqueta: 'Todos los estados' },
              { valor: 'emitida', etiqueta: 'Emitidas' },
              { valor: 'anulada', etiqueta: 'Anuladas' },
            ]}
          />
          <FiltroSelect
            etiqueta="Vendedor"
            valor={f.vendedor}
            alCambiar={(vendedor) => cambiar({ vendedor })}
            opciones={[{ valor: '', etiqueta: 'Todos los vendedores' }, ...(vendedores.data ?? []).map((v) => ({ valor: v.id, etiqueta: v.nombre }))]}
          />
          <FiltroSelect
            etiqueta="Condición"
            valor={f.condicion}
            alCambiar={(condicion) => cambiar({ condicion })}
            opciones={[
              { valor: '', etiqueta: 'Contado y crédito' },
              { valor: 'contado', etiqueta: 'Contado' },
              { valor: 'credito', etiqueta: 'Crédito' },
            ]}
          />
          <Interruptor activo={filtros.sinFactura} etiqueta="Solo sin factura" texto="Sin factura" alCambiar={(activo) => cambiar({ pendiente_factura: activo ? '1' : '' })} />
        </BarraFiltros>

        <SeccionConsulta consulta={consulta}>
          {(datos) => (
            <>
              <Tabla
                etiqueta="Notas de venta"
                columnas={COLUMNAS}
                filas={datos.filas}
                claveFila={(n) => n.id}
                filaInactiva={(n) => n.estado === 'anulada'}
                alClicFila={(n) => navigate(`/notas/${n.id}`)}
                vacio={
                  <EmptyState
                    icono={FileText}
                    titulo="No hay notas con esos filtros"
                    accion={
                      puedeEmitir && (
                        <BotonEnlace a="/notas/nueva" variante="primario" tam="sm" icono={<Plus size={14} />}>
                          Nueva nota
                        </BotonEnlace>
                      )
                    }
                  />
                }
              />
              <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="notas" alCambiar={(p) => cambiar({ pagina: String(p) })} />
            </>
          )}
        </SeccionConsulta>
      </Card>
    </Pagina>
  )
}
