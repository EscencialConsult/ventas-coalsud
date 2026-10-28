import type { StockFila } from '@/core/models/maestros'

/** Una fila de la pestaña Stock: el producto con su almacén, lo que está en vendedores y el total. */
export interface StockProducto {
  producto_id: string
  producto_nombre: string
  linea_id: string
  linea_nombre: string
  stock_minimo: number
  almacen: number
  vendedores: number
  total: number
  /** Total (almacén + vendedores) por regional, para la vista "Todas". */
  porRegional: Record<string, number>
  bajo_minimo: boolean
  /** Las filas de v_stock del producto (ubicaciones del kardex). */
  ubicaciones: StockFila[]
}

/** Agrupa v_stock por producto (06-pantallas/06 §1), respetando el orden en que llegan. */
export function agruparStock(filas: StockFila[]): StockProducto[] {
  const grupos = new Map<string, StockProducto>()
  for (const f of filas) {
    const g = grupos.get(f.producto_id) ?? {
      producto_id: f.producto_id,
      producto_nombre: f.producto_nombre,
      linea_id: f.linea_id,
      linea_nombre: f.linea_nombre,
      stock_minimo: f.stock_minimo,
      almacen: 0,
      vendedores: 0,
      total: 0,
      porRegional: {},
      bajo_minimo: false,
      ubicaciones: [],
    }
    if (f.ubicacion === 'almacen') g.almacen += f.cantidad
    else g.vendedores += f.cantidad
    g.total += f.cantidad
    g.porRegional[f.regional_id] = (g.porRegional[f.regional_id] ?? 0) + f.cantidad
    g.bajo_minimo ||= f.bajo_minimo
    g.ubicaciones.push(f)
    grupos.set(f.producto_id, g)
  }
  return [...grupos.values()]
}

/** "12" o "12.5" → número; vacío o inválido → null. Acepta coma decimal. */
export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(limpio)) return null
  return Number(limpio)
}
