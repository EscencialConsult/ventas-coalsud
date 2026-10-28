import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { DocumentoInventario, FiltrosDocumentos, TipoDocumento } from '@/core/models/inventario'
import { POR_PAGINA } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useDocumentosInventario } from './inventario.queries'
import { TIPOS, TIPOS_DOCUMENTO } from './inventario.tipos'

const FILTROS = { tipo: '', desde: '', hasta: '', pagina: '1' }

const OPCIONES_TIPO = [{ valor: '', etiqueta: 'Todos los tipos' }, ...TIPOS.map((t) => ({ valor: t, etiqueta: TIPOS_DOCUMENTO[t].etiqueta }))]

/** Contra quién o por qué: destino, vendedor, referencia o motivo. */
function detalle(d: DocumentoInventario, recibido: boolean) {
  if (d.tipo === 'traspaso') return <DosLineas principal={recibido ? `Desde ${d.almacen_nombre}` : `A ${d.almacen_destino_nombre ?? '—'}`} secundario={d.referencia ?? undefined} />
  if (d.tipo === 'salida' || d.tipo === 'retorno') return <DosLineas principal={d.vendedor_nombre ?? '—'} secundario={d.referencia ?? undefined} />
  if (d.tipo === 'ajuste') return d.motivo ?? '—'
  return d.referencia ?? <span className="text-texto-3">—</span>
}

// Documentos (06-pantallas/06 §3): los traspasos que llegan de otra regional
// se ven en la regional destino con "Recibido de …".
export default function DocumentosTab() {
  const hoy = useHoy()
  const navigate = useNavigate()
  const { regionalActivaId, opciones } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosDocumentos = { tipo: f.tipo as TipoDocumento | '', desde: f.desde, hasta: f.hasta }
  const consulta = useDocumentosInventario(regionalActivaId, filtros, pagina)

  const recibido = (d: DocumentoInventario) => regionalActivaId !== null && d.regional_id !== regionalActivaId && d.regional_destino_id === regionalActivaId
  // El código de la regional de origen sale del documento (la regional destino no la tiene en su sesión).
  const origen = (d: DocumentoInventario) => opciones.find((r) => r.id === d.regional_id)?.codigo ?? d.numero.split('-')[1]

  const columnas: Columna<DocumentoInventario>[] = [
    {
      clave: 'numero',
      titulo: 'N°',
      principalMovil: true,
      numerico: true,
      render: (d) => (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{d.numero}</span>
          {recibido(d) && <Badge variante="info">Recibido de {origen(d)}</Badge>}
        </span>
      ),
    },
    { clave: 'tipo', titulo: 'Tipo', render: (d) => <Badge variante={TIPOS_DOCUMENTO[d.tipo].tono}>{TIPOS_DOCUMENTO[d.tipo].etiqueta}</Badge> },
    { clave: 'fecha', titulo: 'Fecha', numerico: true, render: (d) => formatoFecha(d.fecha) },
    { clave: 'detalle', titulo: 'Detalle', render: (d) => detalle(d, recibido(d)) },
    { clave: 'items', titulo: 'Ítems', alinear: 'der', numerico: true, render: (d) => formatoCantidad(d.items) },
    { clave: 'usuario', titulo: 'Usuario', ocultarEnMovil: true, render: (d) => d.usuario_nombre },
  ]

  return (
    <>
      <BarraFiltros>
        <FiltroSelect etiqueta="Tipo" valor={f.tipo} alCambiar={(tipo) => cambiar({ tipo })} opciones={OPCIONES_TIPO} />
        <FiltroFechas desde={f.desde} hasta={f.hasta} max={hoy} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
      </BarraFiltros>

      <SeccionConsulta consulta={consulta}>
        {(datos) => (
          <>
            <Tabla
              etiqueta="Documentos de inventario"
              columnas={columnas}
              filas={datos.filas}
              claveFila={(d) => d.id}
              alClicFila={(d) => navigate(`/inventario/documentos/${d.id}`)}
              vacio={<EmptyState icono={FileText} titulo="No hay documentos con esos filtros" />}
            />
            <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="documentos" alCambiar={(p) => cambiar({ pagina: String(p) })} />
          </>
        )}
      </SeccionConsulta>
    </>
  )
}
