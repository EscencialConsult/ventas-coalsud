// Formas de los maestros (Esquema BD §1, Contrato de API §4). snake_case, como en la base.
import type { Canal, CondicionTipo } from './nota-venta'
import type { Rol } from './organizacion'

/** Página de un listado con paginación de servidor (06-pantallas/00 §2). */
export interface Pagina<T> {
  filas: T[]
  total: number
}

export const POR_PAGINA = 50

export interface RegionalMaestro {
  id: string
  codigo: string
  nombre: string
  activo: boolean
}

export interface Almacen {
  id: string
  regional_id: string
  nombre: string
  activo: boolean
}

/** `usuario` + `usuario_regional` (solo los lee el nacional). */
export interface UsuarioSistema {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  debe_cambiar_password: boolean
  /** ids de regional (vacío para el nacional). */
  regionales: string[]
}

export interface LineaComercial {
  id: string
  nombre: string
  /** Orden del reporte diario y del Excel. */
  orden: number
  activo: boolean
}

export interface Producto {
  id: string
  codigo: string | null
  nombre: string
  linea_id: string
  orden: number
  precio_base: number
  stock_minimo: number
  activo: boolean
  linea_comercial: { nombre: string }
}

export interface CondicionPago {
  id: string
  nombre: string
  tipo: CondicionTipo
  dias: number
  orden: number
  activo: boolean
}

export type CategoriaCliente = 'supermercado' | 'mayorista' | 'minorista' | 'institucional'

export interface Cliente {
  id: string
  regional_id: string
  nombre: string
  razon_social: string | null
  nit: string | null
  categoria: CategoriaCliente
  canal: Canal
  vendedor_id: string | null
  condicion_pago_id: string
  zona: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
  vendedor: { nombre: string } | null
  condicion_pago: { nombre: string; tipo: CondicionTipo; dias: number }
}

/** Lo que se envía al crear/editar un cliente (sin las relaciones). */
export type DatosCliente = Omit<Cliente, 'id' | 'vendedor' | 'condicion_pago'>

export interface FiltrosClientes {
  q: string
  categoria: CategoriaCliente | ''
  canal: Canal | ''
  vendedorId: string
  /** 'activos' | 'inactivos' | 'todos' */
  estado: string
}

export interface FiltrosProductos {
  q: string
  lineaId: string
  estado: string
}

/** Fila de `v_stock` (solo las columnas que usa el frontend). */
export interface StockFila {
  producto_id: string
  producto_nombre: string
  /** ⚙ DT-25: línea y orden del reporte, para filtrar y ordenar sin pedir el catálogo. */
  linea_id: string
  linea_nombre: string
  orden: number
  regional_id: string
  ubicacion: 'almacen' | 'vendedor'
  almacen_id: string
  almacen_nombre: string
  vendedor_id: string | null
  vendedor_nombre: string | null
  cantidad: number
  stock_minimo: number
  bajo_minimo: boolean
  /** ⚙ DT-24: para valorizar la mercadería en poder de los vendedores. */
  precio_base: number
}

/** Fila de `v_saldo_documento`. */
export interface SaldoDocumento {
  tipo_doc: 'nota' | 'saldo_inicial'
  documento_id: string
  regional_id: string
  cliente_id: string
  numero: string
  numero_factura: string | null
  fecha: string
  fecha_vencimiento: string | null
  importe: number
  cobrado: number
  /** Devoluciones con abono a cuenta. */
  abonado: number
  saldo: number
  vencido: boolean
  dias_mora: number
}
