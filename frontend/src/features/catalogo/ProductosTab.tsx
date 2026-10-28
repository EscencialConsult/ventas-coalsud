import { useMemo, useState } from 'react'
import { PackageSearch, Pencil, Plus } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { POR_PAGINA, type Producto, type StockFila } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoCantidad } from '@/shared/format/cantidad'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { CampoBusqueda } from '@/shared/ui/CampoBusqueda'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState, Skeleton } from '@/shared/ui/Estados'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { clavesCatalogo, useActivarProducto, useLineas, useProductos, useStockProductos } from './catalogo.queries'
import { ModalProducto } from './components/ModalProducto'

const FILTROS = { q: '', linea: '', estado: 'activos', pagina: '1' }

interface ResumenStock {
  almacen: number
  vendedores: number
  bajo: boolean
}

function resumir(filas: StockFila[] | undefined): Map<string, ResumenStock> {
  const mapa = new Map<string, ResumenStock>()
  for (const f of filas ?? []) {
    const r = mapa.get(f.producto_id) ?? { almacen: 0, vendedores: 0, bajo: false }
    if (f.ubicacion === 'almacen') r.almacen += f.cantidad
    else r.vendedores += f.cantidad
    r.bajo ||= f.bajo_minimo
    mapa.set(f.producto_id, r)
  }
  return mapa
}

// Productos (06-pantallas/05 §1): filtros en la URL, paginación de servidor y
// el stock de la regional activa para las filas visibles.
export default function ProductosTab() {
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros = { q: f.q, lineaId: f.linea, estado: f.estado }
  const consulta = useProductos(filtros, pagina)
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const stock = useStockProductos(consulta.data?.filas.map((p) => p.id) ?? [], regionalActivaId)
  const lineas = useLineas()
  const editable = usePermisos()('catalogo.editar')
  const activar = useActivarProducto()
  const [editando, setEditando] = useState<{ producto: Producto | null } | null>(null)

  const porProducto = useMemo(() => resumir(stock.data), [stock.data])

  const columnas: Columna<Producto>[] = [
    {
      clave: 'producto',
      titulo: 'Producto',
      principalMovil: true,
      render: (p) => <DosLineas principal={<span className="font-medium">{p.nombre}</span>} secundario={[p.linea_comercial.nombre, p.codigo && `Cód. ${p.codigo}`].filter(Boolean).join(' · ')} />,
    },
    { clave: 'precio', titulo: 'Precio', alinear: 'der', numerico: true, render: (p) => <MontoBs valor={p.precio_base} /> },
    { clave: 'minimo', titulo: 'Mínimo', alinear: 'der', numerico: true, render: (p) => (p.stock_minimo ? formatoCantidad(p.stock_minimo) : <span className="text-texto-3">—</span>) },
    {
      clave: 'stock',
      titulo: `Stock ${regionalActiva?.codigo ?? 'total'}`,
      numerico: true,
      render: (p) => {
        if (stock.isPending) return <Skeleton className="inline-block h-4 w-28" />
        const s = porProducto.get(p.id)
        if (!s) return <span className="text-texto-3">Sin stock</span>
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
            <span>
              <span className="text-texto-3">Alm</span> {formatoCantidad(s.almacen)} <span className="text-texto-3">· Vend</span> {formatoCantidad(s.vendedores)}
            </span>
            {s.bajo && (
              <Badge variante="error" punto>
                Bajo mínimo
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (p) => (editable ? <Interruptor activo={p.activo} etiqueta={`${p.nombre} activo`} alCambiar={() => activar.mutate(p)} /> : <EstadoBadge estado={p.activo ? 'activo' : 'inactivo'} />),
    },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (p: Producto) => (
              <BotonIcono etiqueta={`Editar ${p.nombre}`} onClick={() => setEditando({ producto: p })}>
                <Pencil size={15} />
              </BotonIcono>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <BarraFiltros>
        <CampoBusqueda etiqueta="Buscar productos" placeholder="Buscar nombre o código…" valor={f.q} alCambiar={(q) => cambiar({ q }, { reemplazar: true })} />
        <FiltroSelect
          etiqueta="Línea"
          valor={f.linea}
          alCambiar={(linea) => cambiar({ linea })}
          opciones={[{ valor: '', etiqueta: 'Todas las líneas' }, ...(lineas.data ?? []).map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
        />
        <FiltroSelect
          etiqueta="Estado"
          valor={f.estado}
          alCambiar={(estado) => cambiar({ estado })}
          opciones={[
            { valor: 'activos', etiqueta: 'Activos' },
            { valor: 'inactivos', etiqueta: 'Inactivos' },
            { valor: 'todos', etiqueta: 'Todos' },
          ]}
        />
        {editable && (
          <Button icono={<Plus size={16} />} className="w-full sm:ml-auto sm:w-auto" onClick={() => setEditando({ producto: null })}>
            Nuevo producto
          </Button>
        )}
      </BarraFiltros>

      <SeccionConsulta consulta={consulta}>
        {(datos) => (
          <>
            <Tabla
              etiqueta="Productos"
              columnas={columnas}
              filas={datos.filas}
              claveFila={(p) => p.id}
              filaApagada={(p) => !p.activo}
              vacio={<EmptyState icono={PackageSearch} titulo="No hay productos con esos filtros" />}
            />
            <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="productos" alCambiar={(p) => cambiar({ pagina: String(p) })} />
          </>
        )}
      </SeccionConsulta>

      {editando && <ModalProducto producto={editando.producto} claveVisible={clavesCatalogo.listaProductos(filtros, pagina)} alCerrar={() => setEditando(null)} />}
    </>
  )
}
