import type { FiltrosReporte, ProductoVendido, RotacionProducto, TopCliente } from '@/core/models/reportes'
import { etiquetaCategoria } from '@/features/clientes/clientes.opciones'
import type { FormatoCelda } from '@/shared/export/excelTabla'
import { formatoPeriodo } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { reportesService } from './reportes.service'

export interface ColumnaReporte<F> {
  clave: string
  titulo: string
  formato: FormatoCelda
  valor: (fila: F) => string | number | null
  principal?: boolean
  ocultarEnMovil?: boolean
}

/**
 * Un reporte genérico (06-pantallas/11 §1): la misma definición arma la tabla,
 * el Excel (07-Impresion §7) y la impresión.
 */
export interface DefinicionReporte<F> {
  titulo: string
  /** Archivo: `<archivo>_<Regional|Todas>_<desde>_<hasta>.xlsx`. */
  archivo: string
  /** Se calcula por regional: con "Todas" se pide elegir una. */
  porRegional?: boolean
  /** Fijo para las tres regionales (no usa el selector). */
  sinRegional?: boolean
  filtros: ('vendedor' | 'linea' | 'categoria')[]
  claveFila: (fila: F) => string
  consulta: (regionalId: string | null, f: FiltrosReporte) => { queryKey: unknown[]; queryFn: (ctx: { signal: AbortSignal }) => Promise<F[]> }
  columnas: (filas: F[]) => ColumnaReporte<F>[]
}

const clave = (nombre: string, regionalId: string | null, f: FiltrosReporte) => ['reportes', nombre, regionalId, f.desde, f.hasta, f.vendedorId, f.lineaId, f.categoria]
const conPosicion = <T>(filas: T[]) => filas.map((f, i) => ({ ...f, posicion: i + 1 }))

type Top = TopCliente & { posicion: number }
type Vendido = ProductoVendido & { posicion: number }
export interface FilaRegional {
  regional_id: string
  regional: string
  meses: Record<string, number>
  total: number
}

export const REPORTES = {
  clientes: {
    titulo: 'Top clientes',
    archivo: 'TopClientes',
    filtros: ['vendedor', 'categoria'],
    claveFila: (f) => f.cliente_id,
    consulta: (r, f) => ({ queryKey: clave('clientes', r, f), queryFn: ({ signal }) => reportesService.topClientes(r, f, { signal }).then(conPosicion) }),
    columnas: () => [
      { clave: 'posicion', titulo: '#', formato: 'cantidad', valor: (f) => f.posicion },
      { clave: 'cliente', titulo: 'Cliente', formato: 'texto', valor: (f) => f.cliente, principal: true },
      { clave: 'regional', titulo: 'Regional', formato: 'texto', valor: (f) => f.regional, ocultarEnMovil: true },
      { clave: 'categoria', titulo: 'Categoría', formato: 'texto', valor: (f) => etiquetaCategoria(f.categoria) },
      { clave: 'notas', titulo: 'Notas', formato: 'cantidad', valor: (f) => f.notas },
      { clave: 'ventas', titulo: 'Ventas netas', formato: 'monto', valor: (f) => f.ventas_netas },
    ],
  } satisfies DefinicionReporte<Top>,

  productos: {
    titulo: 'Productos más vendidos',
    archivo: 'ProductosVendidos',
    filtros: ['vendedor', 'linea'],
    claveFila: (f) => f.producto_id,
    consulta: (r, f) => ({ queryKey: clave('productos', r, f), queryFn: ({ signal }) => reportesService.productosVendidos(r, f, { signal }).then(conPosicion) }),
    columnas: () => [
      { clave: 'posicion', titulo: '#', formato: 'cantidad', valor: (f) => f.posicion },
      { clave: 'producto', titulo: 'Producto', formato: 'texto', valor: (f) => f.producto, principal: true },
      { clave: 'linea', titulo: 'Línea', formato: 'texto', valor: (f) => f.linea, ocultarEnMovil: true },
      { clave: 'unidades', titulo: 'Unidades', formato: 'cantidad', valor: (f) => f.unidades },
      { clave: 'bs', titulo: 'Bs netos', formato: 'monto', valor: (f) => f.bs_netos },
    ],
  } satisfies DefinicionReporte<Vendido>,

  rotacion: {
    titulo: 'Rotación de inventario',
    archivo: 'Rotacion',
    porRegional: true,
    filtros: [],
    claveFila: (f) => f.producto_id,
    consulta: (r, f) => ({ queryKey: clave('rotacion', r, f), queryFn: ({ signal }) => reportesService.rotacion(r ?? '', f, { signal }) }),
    columnas: () => [
      { clave: 'producto', titulo: 'Producto', formato: 'texto', valor: (f) => f.producto, principal: true },
      { clave: 'linea', titulo: 'Línea', formato: 'texto', valor: (f) => f.linea, ocultarEnMovil: true },
      { clave: 'vendidas', titulo: 'Vendidas', formato: 'cantidad', valor: (f) => f.vendidas },
      { clave: 'inicial', titulo: 'Stock inicial', formato: 'cantidad', valor: (f) => f.stock_inicial, ocultarEnMovil: true },
      { clave: 'final', titulo: 'Stock final', formato: 'cantidad', valor: (f) => f.stock_final },
      { clave: 'promedio', titulo: 'Stock promedio', formato: 'cantidad', valor: (f) => f.stock_promedio, ocultarEnMovil: true },
      { clave: 'rotacion', titulo: 'Rotación', formato: 'cantidad', valor: (f) => f.rotacion },
      { clave: 'dias', titulo: 'Días de inventario', formato: 'cantidad', valor: (f) => f.dias_inventario },
    ],
  } satisfies DefinicionReporte<RotacionProducto>,

  regionales: {
    titulo: 'Ventas por regional',
    archivo: 'VentasRegional',
    sinRegional: true,
    filtros: [],
    claveFila: (f) => f.regional_id,
    consulta: (_r, f) => ({
      queryKey: clave('regionales', null, f),
      // Regional × mes (la base devuelve filas; se pivotean para mostrar).
      queryFn: async ({ signal }) => {
        const filas = await reportesService.ventasRegional(f, { signal })
        const porRegional = new Map<string, FilaRegional>()
        for (const v of filas) {
          const g = porRegional.get(v.regional_id) ?? { regional_id: v.regional_id, regional: v.regional, meses: {}, total: 0 }
          g.meses[v.mes] = v.ventas_netas
          g.total = redondear(g.total + v.ventas_netas)
          porRegional.set(v.regional_id, g)
        }
        return [...porRegional.values()]
      },
    }),
    columnas: (filas) => [
      { clave: 'regional', titulo: 'Regional', formato: 'texto', valor: (f) => f.regional, principal: true },
      ...Object.keys(filas[0]?.meses ?? {}).map((mes) => ({ clave: mes, titulo: formatoPeriodo(mes), formato: 'monto' as const, valor: (f: FilaRegional) => f.meses[mes] ?? 0 })),
      { clave: 'total', titulo: 'Total', formato: 'monto', valor: (f) => f.total },
    ],
  } satisfies DefinicionReporte<FilaRegional>,
}

export type ClaveReporte = keyof typeof REPORTES

export const PESTANAS_REPORTES = [
  { etiqueta: 'Top clientes', a: '/reportes/clientes' },
  { etiqueta: 'Productos', a: '/reportes/productos' },
  { etiqueta: 'Rotación', a: '/reportes/rotacion' },
  { etiqueta: 'Por regional', a: '/reportes/regionales' },
  { etiqueta: 'Rendimiento por vendedor', a: '/reportes/vendedores' },
  { etiqueta: 'Movimiento por período', a: '/reportes/movimiento' },
]
