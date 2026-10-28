import {
  ArrowLeftRight, Calculator, ChartColumn, FileText, HandCoins, Landmark, LayoutDashboard, Package, PackagePlus, ScrollText,
  Settings, Target, Truck, Undo2, UserCog, UserRound, Users, Warehouse, type LucideIcon,
} from 'lucide-react'
import type { Accion } from '@/core/auth/permisos'
import type { Avisos } from '@/core/models/dashboard'

// Menú por rol (05-Navegacion_y_Permisos §1). Sin "Estado de cuentas" ni
// "Rendición" para la sucursal (F2, ⚠ SUP-51): los cobros van dentro de Liquidación.
export interface ItemMenu {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  /** Si se define, el ítem solo se muestra a quien puede esta acción. */
  visibleCon?: Accion
  badge?: keyof Pick<Avisos, 'bajo_minimo' | 'notas_sin_factura'> | 'dias_pendientes'
  /** Coincidencia exacta de ruta para marcarlo activo (Dashboard en "/"). */
  exacta?: boolean
}

export interface GrupoMenu {
  titulo: string
  items: ItemMenu[]
}

export const MENU: GrupoMenu[] = [
  { titulo: 'Principal', items: [{ etiqueta: 'Dashboard', ruta: '/', icono: LayoutDashboard, exacta: true }] },
  {
    titulo: 'Gestión',
    items: [
      { etiqueta: 'Clientes', ruta: '/clientes', icono: Users },
      { etiqueta: 'Vendedores', ruta: '/vendedores', icono: UserRound },
      { etiqueta: 'Productos', ruta: '/catalogo/productos', icono: Package },
      { etiqueta: 'Inventario', ruta: '/inventario', icono: Warehouse, badge: 'bajo_minimo' },
    ],
  },
  {
    titulo: 'Comercial',
    items: [
      { etiqueta: 'Notas de venta', ruta: '/notas', icono: FileText, badge: 'notas_sin_factura', exacta: true },
      { etiqueta: 'Hoja de carga', ruta: '/notas/hoja-carga', icono: Truck },
      { etiqueta: 'Liquidación diaria', ruta: '/liquidacion', icono: Calculator, badge: 'dias_pendientes' },
      { etiqueta: 'Devoluciones', ruta: '/devoluciones', icono: Undo2 },
      { etiqueta: 'Estado de cuentas', ruta: '/eecc', icono: Landmark, visibleCon: 'eecc.ver' },
    ],
  },
  { titulo: 'Planificación', items: [{ etiqueta: 'Presupuesto', ruta: '/presupuesto', icono: Target }] },
  { titulo: 'Análisis', items: [{ etiqueta: 'Reportes', ruta: '/reportes', icono: ChartColumn }] },
  {
    titulo: 'Administración',
    items: [
      { etiqueta: 'Usuarios', ruta: '/usuarios', icono: UserCog, visibleCon: 'usuarios.administrar' },
      { etiqueta: 'Configuración', ruta: '/configuracion', icono: Settings, visibleCon: 'configuracion.editar' },
      { etiqueta: 'Auditoría', ruta: '/auditoria', icono: ScrollText, visibleCon: 'auditoria.ver' },
    ],
  },
]

export interface AccionRapida {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  /** Solo se ofrece a quien puede hacerla (con la regional activa). */
  requiere: Accion
}

// Botón "+ Nuevo" del topbar: altas frecuentes de la operación diaria
// (rutas de 05-Navegacion_y_Permisos §2).
export const ACCIONES_RAPIDAS: AccionRapida[] = [
  { etiqueta: 'Nota de venta', ruta: '/notas/nueva', icono: FileText, requiere: 'nota.emitir' },
  { etiqueta: 'Registrar cobro', ruta: '/cobranzas/nueva', icono: HandCoins, requiere: 'cobranza.registrar' },
  { etiqueta: 'Ingreso a almacén', ruta: '/inventario/nuevo/ingreso', icono: PackagePlus, requiere: 'inventario.operar' },
  { etiqueta: 'Traspaso entre almacenes', ruta: '/inventario/nuevo/traspaso', icono: ArrowLeftRight, requiere: 'inventario.operar' },
]
