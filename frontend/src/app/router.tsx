import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom'
import type { Accion } from '@/core/auth/permisos'
import { RolGuard } from '@/core/auth/RolGuard'
import { RutaPrivada } from '@/core/auth/RutaPrivada'
import { ErrorRuta } from '@/core/errores/ErrorRuta'
import { AppShell } from '@/shared/layout/AppShell'
import { PantallaCarga } from '@/shared/ui/PantallaCarga'

// Mapa de rutas (05-Navegacion_y_Permisos §2).

/** Pantalla con carga diferida (regla 23); con `accion`, además, el guard de permisos. */
function pantalla(path: string, titulo: string, cargar: () => Promise<{ default: ComponentType }>, accion?: Accion): RouteObject {
  return {
    path,
    handle: { titulo },
    lazy: async () => {
      const { default: Componente } = await cargar()
      if (!accion) return { Component: Componente }
      return {
        Component: () => (
          <RolGuard accion={accion}>
            <Componente />
          </RolGuard>
        ),
      }
    },
  }
}

const pantallas: RouteObject[] = [
  {
    index: true,
    // filtroPeriodo: muestra el filtro de fecha en el topbar (⚙ DT-23).
    handle: { titulo: 'Dashboard', filtroPeriodo: true },
    lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).default }),
  },
  // Sprint 2 · maestros (FE-06 a FE-09)
  pantalla('clientes', 'Clientes', () => import('@/features/clientes/ClientesPage')),
  pantalla('clientes/:id', 'Cliente', () => import('@/features/clientes/ClienteDetallePage')),
  pantalla('vendedores', 'Vendedores', () => import('@/features/vendedores/VendedoresPage')),
  {
    path: 'catalogo',
    handle: { titulo: 'Catálogo' },
    lazy: async () => ({ Component: (await import('@/features/catalogo/CatalogoPage')).default }),
    children: [
      { index: true, element: <Navigate to="productos" replace /> },
      pantalla('productos', 'Productos', () => import('@/features/catalogo/ProductosTab')),
      pantalla('lineas', 'Líneas comerciales', () => import('@/features/catalogo/LineasTab')),
      pantalla('condiciones', 'Condiciones de pago', () => import('@/features/catalogo/CondicionesTab')),
    ],
  },
  pantalla('configuracion', 'Configuración', () => import('@/features/configuracion/ConfiguracionPage'), 'configuracion.editar'),
  pantalla('usuarios', 'Usuarios', () => import('@/features/usuarios/UsuariosPage'), 'usuarios.administrar'),
  // Sprint 3 · inventario (FE-10 a FE-12)
  {
    path: 'inventario',
    handle: { titulo: 'Inventario' },
    lazy: async () => ({ Component: (await import('@/features/inventario/InventarioPage')).default }),
    children: [
      { index: true, element: <Navigate to="stock" replace /> },
      pantalla('stock', 'Stock', () => import('@/features/inventario/StockTab')),
      pantalla('movimientos', 'Movimientos', () => import('@/features/inventario/MovimientosTab')),
      pantalla('documentos', 'Documentos de inventario', () => import('@/features/inventario/DocumentosTab')),
      pantalla('vendedores', 'Mercadería en vendedores', () => import('@/features/inventario/VendedoresTab')),
    ],
  },
  pantalla('inventario/documentos/:id', 'Documento de inventario', () => import('@/features/inventario/DocumentoDetallePage')),
  pantalla('inventario/nuevo/:tipo', 'Documento de inventario', () => import('@/features/inventario/NuevoDocumentoPage'), 'inventario.operar'),
  // Sprint 4 · notas de venta (FE-13 a FE-15)
  pantalla('notas', 'Notas de venta', () => import('@/features/notas/NotasPage')),
  pantalla('notas/nueva', 'Nueva nota de venta', () => import('@/features/notas/NuevaNotaPage'), 'nota.emitir'),
  pantalla('notas/hoja-carga', 'Hoja de carga', () => import('@/features/notas/HojaCargaPage')),
  pantalla('notas/:id', 'Nota de venta', () => import('@/features/notas/NotaDetallePage')),
  // Sprint 5 · cobranzas y devoluciones (FE-16, FE-17)
  pantalla('devoluciones', 'Devoluciones', () => import('@/features/devoluciones/DevolucionesPage')),
  pantalla('cobranzas/nueva', 'Registrar cobro', () => import('@/features/cobranzas/CobroPage'), 'cobranza.registrar'),
  // Sprint 6 · liquidación (FE-18 a FE-20)
  pantalla('liquidacion', 'Liquidación diaria', () => import('@/features/liquidacion/IrAHoyPage')),
  pantalla('liquidacion/historial', 'Historial de liquidaciones', () => import('@/features/liquidacion/HistorialLiquidacionPage')),
  pantalla('liquidacion/:fecha', 'Liquidación diaria', () => import('@/features/liquidacion/LiquidacionPage')),
  pantalla('presupuesto', 'Presupuesto', () => import('@/features/presupuesto/PresupuestoPage')),
  // Sprint 7 · reportes (FE-22): una subruta por reporte
  {
    path: 'reportes',
    handle: { titulo: 'Reportes' },
    lazy: async () => ({ Component: (await import('@/features/reportes/ReportesPage')).default }),
    children: [
      { index: true, element: <Navigate to="clientes" replace /> },
      pantalla('vendedores', 'Rendimiento por vendedor', () => import('@/features/cobranzas/RendimientoPage')),
      pantalla('movimiento', 'Movimiento por período', () => import('@/features/reportes/MovimientoTab')),
      pantalla(':reporte', 'Reportes', () => import('@/features/reportes/ReporteGenericoTab')),
    ],
  },
  pantalla('eecc', 'Estado de cuentas por cobrar', () => import('@/features/eecc/EeccPage'), 'eecc.ver'),
  pantalla('auditoria', 'Auditoría', () => import('@/features/auditoria/AuditoriaPage'), 'auditoria.ver'),
  ...(import.meta.env.DEV
    ? [
        {
          path: 'dev/ui',
          handle: { titulo: 'Componentes' },
          lazy: async () => ({ Component: (await import('@/features/dev/UiPage')).default }),
        },
      ]
    : []),
  {
    path: '*',
    handle: { titulo: 'Página no encontrada' },
    lazy: async () => ({ Component: (await import('@/features/varios/NoEncontrada')).default }),
  },
]

// errorElement: React Router atrapa los errores de pantalla antes que el
// límite de la raíz; se muestra la misma PantallaError (regla 34).
export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).default }),
    hydrateFallbackElement: <PantallaCarga />,
    errorElement: <ErrorRuta />,
  },
  {
    path: '/cambiar-password',
    hydrateFallbackElement: <PantallaCarga />,
    errorElement: <ErrorRuta />,
    lazy: async () => {
      const { default: CambiarPasswordPage } = await import('@/features/auth/CambiarPasswordPage')
      return {
        Component: () => (
          <RutaPrivada esCambioPassword>
            <CambiarPasswordPage />
          </RutaPrivada>
        ),
      }
    },
  },
  // Impresiones: pestañas sin shell (07-Impresion §1).
  {
    path: '/imprimir',
    element: (
      <RutaPrivada>
        <Outlet />
      </RutaPrivada>
    ),
    hydrateFallbackElement: <PantallaCarga />,
    errorElement: <ErrorRuta />,
    children: [
      { path: 'nota/:id', lazy: async () => ({ Component: (await import('@/features/notas/impresion/ImprimirNotaPage')).default }) },
      { path: 'liquidacion/:fecha', lazy: async () => ({ Component: (await import('@/features/liquidacion/impresion/ImprimirLiquidacionPage')).default }) },
      { path: 'eecc', lazy: async () => ({ Component: (await import('@/features/eecc/impresion/ImprimirEeccPage')).default }) },
      { path: 'reporte/:clave', lazy: async () => ({ Component: (await import('@/features/reportes/impresion/ImprimirReportePage')).default }) },
      { path: 'rendimiento', lazy: async () => ({ Component: (await import('@/features/cobranzas/impresion/ImprimirRendimientoPage')).default }) },
      { path: 'hoja-carga/:fecha', lazy: async () => ({ Component: (await import('@/features/notas/impresion/ImprimirHojaCargaPage')).default }) },
    ],
  },
  {
    path: '/',
    element: (
      <RutaPrivada>
        <AppShell />
      </RutaPrivada>
    ),
    hydrateFallbackElement: <PantallaCarga />,
    errorElement: <ErrorRuta />,
    children: pantallas,
  },
])
