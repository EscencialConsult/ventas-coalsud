import type { CondicionPago, FiltrosProductos, LineaComercial, Pagina, Producto, StockFila } from '@/core/models/maestros'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { catalogoFixtures } from './catalogo.service.fixtures'
import { catalogoSupabase } from './catalogo.service.supabase'

// Catálogo (06-pantallas/05): lo leen todos, lo edita solo el nacional (⚠ SUP-02, RLS patrón A).

export type DatosProducto = Pick<Producto, 'codigo' | 'nombre' | 'linea_id' | 'orden' | 'precio_base' | 'stock_minimo' | 'activo'>
export type DatosLinea = Pick<LineaComercial, 'nombre' | 'activo'>
export type DatosCondicion = Pick<CondicionPago, 'nombre' | 'tipo' | 'dias' | 'orden' | 'activo'>

/** Solo las columnas editables (lo que viaja en el update). */
export const datosProducto = ({ codigo, nombre, linea_id, orden, precio_base, stock_minimo, activo }: Producto): DatosProducto => ({ codigo, nombre, linea_id, orden, precio_base, stock_minimo, activo })
export const datosCondicion = ({ nombre, tipo, dias, orden, activo }: CondicionPago): DatosCondicion => ({ nombre, tipo, dias, orden, activo })

export interface ServicioCatalogo {
  productos(filtros: FiltrosProductos, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<Producto>>
  /** Todos los activos, en el orden del reporte: combos de productos (documentos, notas). Catálogo (regla 17). */
  productosActivos(opciones?: OpcionesPeticion): Promise<Producto[]>
  guardarProducto(id: string | null, datos: DatosProducto): Promise<Producto>
  /** v_stock de los productos visibles (regional activa; null = todas las legibles). */
  stockDeProductos(ids: string[], regionalId: string | null, opciones?: OpcionesPeticion): Promise<StockFila[]>
  lineas(opciones?: OpcionesPeticion): Promise<LineaComercial[]>
  guardarLinea(id: string | null, datos: DatosLinea): Promise<LineaComercial>
  /** Solo las líneas cuyo orden cambió. */
  reordenarLineas(cambios: { id: string; orden: number }[]): Promise<void>
  condiciones(opciones?: OpcionesPeticion): Promise<CondicionPago[]>
  guardarCondicion(id: string | null, datos: DatosCondicion): Promise<CondicionPago>
}

export const catalogoService: ServicioCatalogo = MODO_FIXTURES ? catalogoFixtures : catalogoSupabase
