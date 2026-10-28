import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { FiltrosMovimientos, Movimiento, TipoMovimiento } from '@/core/models/inventario'
import { POR_PAGINA } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useProductosActivos } from '@/features/catalogo/catalogo.queries'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFecha } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { CampoBusqueda } from '@/shared/ui/CampoBusqueda'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { CantidadMovimiento } from './components/CantidadMovimiento'
import { useMovimientos } from './inventario.queries'
import { TIPOS_MOVIMIENTO } from './inventario.tipos'

const FILTROS = { documento: '', desde: '', hasta: '', tipo: '', producto: '', pagina: '1' }

const OPCIONES_TIPO = [{ valor: '', etiqueta: 'Todos los tipos' }, ...Object.entries(TIPOS_MOVIMIENTO).map(([valor, t]) => ({ valor, etiqueta: t.etiqueta }))]

const COLUMNAS: Columna<Movimiento>[] = [
  { clave: 'fecha', titulo: 'Fecha', numerico: true, render: (m) => formatoFecha(m.fecha) },
  { clave: 'tipo', titulo: 'Tipo', render: (m) => <Badge variante={TIPOS_MOVIMIENTO[m.tipo].tono}>{TIPOS_MOVIMIENTO[m.tipo].etiqueta}</Badge> },
  {
    clave: 'documento',
    titulo: 'Documento',
    numerico: true,
    // Enlace al documento de inventario o a la nota que lo originó.
    render: (m) => {
      const destino = m.documento_id ? `/inventario/documentos/${m.documento_id}` : m.nota_venta_id ? `/notas/${m.nota_venta_id}` : null
      return destino ? (
        <Link to={destino} className="font-medium text-rojo hover:underline">
          {m.documento_numero}
        </Link>
      ) : (
        <span className="font-medium">{m.documento_numero}</span>
      )
    },
  },
  { clave: 'producto', titulo: 'Producto', principalMovil: true, render: (m) => m.producto_nombre },
  { clave: 'ubicacion', titulo: 'Ubicación', render: (m) => m.vendedor_nombre ?? m.almacen_nombre },
  { clave: 'cantidad', titulo: 'Cantidad', alinear: 'der', render: (m) => <CantidadMovimiento valor={m.cantidad} /> },
  { clave: 'usuario', titulo: 'Usuario', ocultarEnMovil: true, render: (m) => m.usuario_nombre },
]

// Movimientos (06-pantallas/06 §2): v_movimiento con filtros en la URL y
// paginación de servidor.
export default function MovimientosTab() {
  const hoy = useHoy()
  const { regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosMovimientos = { desde: f.desde, hasta: f.hasta, tipo: f.tipo as TipoMovimiento | '', productoId: f.producto, documento: f.documento }
  const consulta = useMovimientos(regionalActivaId, filtros, pagina)
  const productos = useProductosActivos()

  return (
    <>
      <BarraFiltros>
        <CampoBusqueda etiqueta="Buscar por documento" placeholder="N° de documento o nota…" valor={f.documento} alCambiar={(documento) => cambiar({ documento }, { reemplazar: true })} />
        <FiltroFechas desde={f.desde} hasta={f.hasta} max={hoy} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
        <FiltroSelect etiqueta="Tipo" valor={f.tipo} alCambiar={(tipo) => cambiar({ tipo })} opciones={OPCIONES_TIPO} />
        <FiltroSelect
          etiqueta="Producto"
          buscable
          valor={f.producto}
          alCambiar={(producto) => cambiar({ producto })}
          opciones={[{ valor: '', etiqueta: 'Todos los productos' }, ...(productos.data ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre }))]}
        />
      </BarraFiltros>

      <SeccionConsulta consulta={consulta}>
        {(datos) => (
          <>
            <Tabla etiqueta="Movimientos de inventario" columnas={COLUMNAS} filas={datos.filas} claveFila={(m) => m.id} vacio={<EmptyState icono={ArrowLeftRight} titulo="No hay movimientos con esos filtros" />} />
            <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="movimientos" alCambiar={(p) => cambiar({ pagina: String(p) })} />
          </>
        )}
      </SeccionConsulta>
    </>
  )
}
