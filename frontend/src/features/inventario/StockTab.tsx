import { useMemo, useState } from 'react'
import { Info, PackageSearch } from 'lucide-react'
import { POR_PAGINA } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoCantidad } from '@/shared/format/cantidad'
import { normalizar } from '@/shared/format/texto'
import { Badge } from '@/shared/ui/Badge'
import { CampoBusqueda } from '@/shared/ui/CampoBusqueda'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EmptyState } from '@/shared/ui/Estados'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { ModalKardex } from './components/ModalKardex'
import { agruparStock, type StockProducto } from './inventario.calculos'
import { useStockInventario } from './inventario.queries'

const FILTROS = { q: '', linea: '', bajo_minimo: '', pagina: '1' }

const cifra = (valor: number) => (valor ? formatoCantidad(valor) : <span className="text-texto-3">—</span>)

// Stock (06-pantallas/06 §1): v_stock de la regional entero (lista corta) y
// filtrado en pantalla, sin un request por filtro. Clic en una fila → kardex.
export default function StockTab() {
  const { regionalActiva, regionalActivaId, opciones } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const consulta = useStockInventario(regionalActivaId)
  const [kardex, setKardex] = useState<StockProducto | null>(null)
  const productos = useMemo(() => agruparStock(consulta.data ?? []), [consulta.data])

  const lineas = [...new Map(productos.map((p) => [p.linea_id, p.linea_nombre])).entries()].map(([valor, etiqueta]) => ({ valor, etiqueta }))
  const q = normalizar(f.q)
  const filtrados = productos.filter((p) => (!f.linea || p.linea_id === f.linea) && (!f.bajo_minimo || p.bajo_minimo) && (!q || normalizar(p.producto_nombre).includes(q)))
  const pagina = Math.max(1, Number(f.pagina) || 1)

  const columnas: Columna<StockProducto>[] = [
    {
      clave: 'producto',
      titulo: 'Producto',
      principalMovil: true,
      render: (p) => (
        <DosLineas
          principal={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{p.producto_nombre}</span>
              {p.bajo_minimo && (
                <Badge variante="error" punto>
                  Bajo mínimo
                </Badge>
              )}
            </span>
          }
          secundario={p.linea_nombre}
        />
      ),
    },
    // Con "Todas" (nacional): una columna por regional.
    ...(regionalActiva
      ? [
          { clave: 'almacen', titulo: 'Almacén', alinear: 'der' as const, numerico: true, render: (p: StockProducto) => cifra(p.almacen) },
          { clave: 'vendedores', titulo: 'En vendedores', alinear: 'der' as const, numerico: true, render: (p: StockProducto) => cifra(p.vendedores) },
        ]
      : opciones.map((r) => ({ clave: r.id, titulo: r.codigo, alinear: 'der' as const, numerico: true, render: (p: StockProducto) => cifra(p.porRegional[r.id] ?? 0) }))),
    { clave: 'total', titulo: 'Total', alinear: 'der', numerico: true, render: (p) => <span className="font-semibold">{formatoCantidad(p.total)}</span> },
    { clave: 'minimo', titulo: 'Mínimo', alinear: 'der', numerico: true, ocultarEnMovil: true, render: (p) => cifra(p.stock_minimo) },
  ]

  return (
    <>
      <BarraFiltros>
        <CampoBusqueda etiqueta="Buscar productos" placeholder="Buscar producto…" valor={f.q} alCambiar={(texto) => cambiar({ q: texto }, { reemplazar: true })} />
        <FiltroSelect etiqueta="Línea" valor={f.linea} alCambiar={(linea) => cambiar({ linea })} opciones={[{ valor: '', etiqueta: 'Todas las líneas' }, ...lineas]} />
        <Interruptor activo={f.bajo_minimo === '1'} etiqueta="Solo bajo mínimo" texto="Solo bajo mínimo" alCambiar={(activo) => cambiar({ bajo_minimo: activo ? '1' : '' })} />
      </BarraFiltros>

      <SeccionConsulta consulta={consulta}>
        {() => (
          <>
            <Tabla
              etiqueta="Stock por producto"
              columnas={columnas}
              filas={filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)}
              claveFila={(p) => p.producto_id}
              alClicFila={setKardex}
              vacio={<EmptyState icono={PackageSearch} titulo={f.bajo_minimo ? 'Ningún producto bajo el mínimo' : 'No hay productos con esos filtros'} />}
            />
            <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} unidad="productos" alCambiar={(p) => cambiar({ pagina: String(p) })} />
          </>
        )}
      </SeccionConsulta>
      <p className="flex items-center gap-1.5 border-t border-borde px-4 py-2.5 text-chico text-texto-3">
        <Info size={13} aria-hidden />
        El stock no se edita: cambia con ingresos, ventas, traspasos y ajustes.
      </p>

      {kardex && <ModalKardex producto={kardex} variasRegionales={!regionalActiva} alCerrar={() => setKardex(null)} />}
    </>
  )
}
