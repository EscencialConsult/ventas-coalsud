import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { avisarErrorToggle } from '@/core/errores/errorFormulario'
import type { CondicionPago, FiltrosProductos, LineaComercial, Producto } from '@/core/models/maestros'
import { agregarFila, cambiarFilaOptimista, reemplazarFila } from '@/lib/cacheListas'
import { catalogoService, datosCondicion, datosProducto, type DatosCondicion, type DatosLinea, type DatosProducto } from './catalogo.service'

// Líneas y condiciones son catálogos (regla 17): una vez, 5 min, compartidos
// con los combos de otras pantallas. Productos se pagina en el servidor.
const MAESTRO = 5 * 60_000

export const clavesCatalogo = {
  productos: ['productos'] as const,
  activos: ['productos', 'activos'] as const,
  listaProductos: (f: FiltrosProductos, pagina: number) => ['productos', 'lista', f.q, f.lineaId, f.estado, pagina] as const,
  stock: (regionalId: string | null, ids: string) => ['stock', 'productos', regionalId, ids] as const,
  lineas: ['lineas'] as const,
  condiciones: ['condiciones'] as const,
}

export function useProductos(filtros: FiltrosProductos, pagina: number) {
  return useQuery({
    queryKey: clavesCatalogo.listaProductos(filtros, pagina),
    queryFn: ({ signal }) => catalogoService.productos(filtros, pagina, { signal }),
  })
}

/** Stock de los productos de la página visible: se pide recién cuando la página llegó. */
export function useStockProductos(ids: string[], regionalId: string | null) {
  const clave = ids.join(',')
  return useQuery({
    queryKey: clavesCatalogo.stock(regionalId, clave),
    queryFn: ({ signal }) => catalogoService.stockDeProductos(ids, regionalId, { signal }),
    enabled: ids.length > 0,
  })
}

/** Combo de productos de documentos y notas (regla 17: catálogo, 5 min). */
export function useProductosActivos() {
  return useQuery({ queryKey: clavesCatalogo.activos, queryFn: ({ signal }) => catalogoService.productosActivos({ signal }), staleTime: MAESTRO })
}

export function useGuardarProducto(claveVisible: QueryKey) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosProducto }) => catalogoService.guardarProducto(id, datos),
    onSuccess: (producto, { id }) => {
      if (id) reemplazarFila(qc, clavesCatalogo.productos, producto)
      else agregarFila(qc, clavesCatalogo.productos, claveVisible, producto)
      // El combo de activos se vuelve a pedir recién cuando se use.
      void qc.invalidateQueries({ queryKey: clavesCatalogo.activos, refetchType: 'none' })
    },
    // El formulario muestra el error en el campo o en un toast.
    onError: () => undefined,
  })
}

// Activar/desactivar: optimista con rollback y aviso (regla 15).
export function useActivarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Producto) => catalogoService.guardarProducto(p.id, { ...datosProducto(p), activo: !p.activo }),
    onMutate: (p) => cambiarFilaOptimista<Producto>(qc, clavesCatalogo.productos, p.id, { activo: !p.activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: clavesCatalogo.activos, refetchType: 'none' }),
    onError: (error, _p, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}

export function useLineas() {
  return useQuery({ queryKey: clavesCatalogo.lineas, queryFn: ({ signal }) => catalogoService.lineas({ signal }), staleTime: MAESTRO })
}

export function useGuardarLinea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosLinea }) => catalogoService.guardarLinea(id, datos),
    onSuccess: (linea, { id }) => {
      if (id) {
        reemplazarFila(qc, clavesCatalogo.lineas, linea)
        // El nombre de la línea se ve en las filas de productos: quedan viejas, sin pedirlas ahora.
        void qc.invalidateQueries({ queryKey: clavesCatalogo.productos, refetchType: 'none' })
      } else {
        qc.setQueryData<LineaComercial[]>(clavesCatalogo.lineas, (lineas) => (lineas ? [...lineas, linea] : lineas))
      }
    },
    onError: () => undefined,
  })
}

export function useActivarLinea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (l: LineaComercial) => catalogoService.guardarLinea(l.id, { nombre: l.nombre, activo: !l.activo }),
    onMutate: (l) => cambiarFilaOptimista<LineaComercial>(qc, clavesCatalogo.lineas, l.id, { activo: !l.activo }),
    onError: (error, _l, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}

/** Reordenar (arrastrar o flechas): optimista; solo viajan las líneas que cambiaron de lugar. */
export function useReordenarLineas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cambios: { id: string; orden: number }[]) => catalogoService.reordenarLineas(cambios),
    onMutate: (cambios) => {
      const previas = qc.getQueryData<LineaComercial[]>(clavesCatalogo.lineas)
      const orden = new Map(cambios.map((c) => [c.id, c.orden]))
      qc.setQueryData<LineaComercial[]>(clavesCatalogo.lineas, (lineas) =>
        lineas?.map((l) => ({ ...l, orden: orden.get(l.id) ?? l.orden })).sort((a, b) => a.orden - b.orden),
      )
      return () => qc.setQueryData(clavesCatalogo.lineas, previas)
    },
    onError: (error, _c, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}

export function useCondiciones() {
  return useQuery({ queryKey: clavesCatalogo.condiciones, queryFn: ({ signal }) => catalogoService.condiciones({ signal }), staleTime: MAESTRO })
}

export function useGuardarCondicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosCondicion }) => catalogoService.guardarCondicion(id, datos),
    onSuccess: (condicion, { id }) => {
      if (id) reemplazarFila(qc, clavesCatalogo.condiciones, condicion)
      else qc.setQueryData<CondicionPago[]>(clavesCatalogo.condiciones, (lista) => (lista ? [...lista, condicion].sort((a, b) => a.orden - b.orden) : lista))
    },
    onError: () => undefined,
  })
}

export function useActivarCondicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: CondicionPago) => catalogoService.guardarCondicion(c.id, { ...datosCondicion(c), activo: !c.activo }),
    onMutate: (c) => cambiarFilaOptimista<CondicionPago>(qc, clavesCatalogo.condiciones, c.id, { activo: !c.activo }),
    onError: (error, _c, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}
