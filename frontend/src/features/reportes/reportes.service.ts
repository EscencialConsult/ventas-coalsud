import type { FiltrosReporte, MovimientoPeriodo, ProductoVendido, RotacionProducto, TopCliente, VentaRegionalMes } from '@/core/models/reportes'
import { responder } from '@/fixtures/latencia'
import { CLIENTES, LINEAS, PRODUCTOS } from '@/fixtures/maestros'
import { REGIONALES } from '@/fixtures/organizacion'
import { MOVIMIENTOS } from '@/fixtures/inventario'
import { regionalesLegibles } from '@/fixtures/sesion'
import { ITEMS_NOTA, NOTAS, ventasEnRango } from '@/fixtures/ventas'
import { matriz } from '@/features/liquidacion/liquidacion.service.fixtures'
import { diasEntre, finDeMes, sumarMeses } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// Reportes comerciales (06-pantallas/11 §1, Contrato §6). Servicio chico: las
// dos implementaciones van en el mismo archivo.

/** Límite de filas de los "top" (p_limite). */
export const LIMITE_TOP = 50

export interface ServicioReportes {
  topClientes(regionalId: string | null, f: FiltrosReporte, opciones?: OpcionesPeticion): Promise<TopCliente[]>
  productosVendidos(regionalId: string | null, f: FiltrosReporte, opciones?: OpcionesPeticion): Promise<ProductoVendido[]>
  rotacion(regionalId: string, f: FiltrosReporte, opciones?: OpcionesPeticion): Promise<RotacionProducto[]>
  /** Siempre las tres regionales (F2). */
  ventasRegional(f: FiltrosReporte, opciones?: OpcionesPeticion): Promise<VentaRegionalMes[]>
  movimientoPeriodo(regionalId: string, f: FiltrosReporte, opciones?: OpcionesPeticion): Promise<MovimientoPeriodo>
}

const suma = (valores: number[]) => redondear(valores.reduce((t, v) => t + v, 0))
const lineaDe = (productoId: string) => {
  const p = PRODUCTOS.find((x) => x.id === productoId)
  return LINEAS.find((l) => l.id === p?.linea_id)?.nombre ?? ''
}

/** Notas emitidas del período y del filtro (vendedor, categoría del cliente). */
function notasDe(regionalId: string | null, f: FiltrosReporte) {
  const regionales = regionalesLegibles(regionalId)
  return NOTAS.filter(
    (n) =>
      regionales.includes(n.regional_id) &&
      n.estado === 'emitida' &&
      n.fecha >= f.desde &&
      n.fecha <= f.hasta &&
      (!f.vendedorId || n.vendedor_id === f.vendedorId) &&
      (!f.categoria || CLIENTES.find((c) => c.id === n.cliente_id)?.categoria === f.categoria),
  )
}

const fixtures: ServicioReportes = {
  async topClientes(regionalId, f, opciones) {
    const grupos = new Map<string, TopCliente>()
    for (const n of notasDe(regionalId, f)) {
      const cliente = CLIENTES.find((c) => c.id === n.cliente_id)
      const g = grupos.get(n.cliente_id) ?? { cliente_id: n.cliente_id, cliente: n.cliente_nombre, regional: n.regional_codigo, categoria: cliente?.categoria ?? 'mayorista', notas: 0, ventas_netas: 0 }
      g.notas++
      g.ventas_netas = redondear(g.ventas_netas + n.total)
      grupos.set(n.cliente_id, g)
    }
    return responder([...grupos.values()].sort((a, b) => b.ventas_netas - a.ventas_netas).slice(0, LIMITE_TOP), opciones)
  },

  async productosVendidos(regionalId, f, opciones) {
    const grupos = new Map<string, ProductoVendido>()
    for (const n of notasDe(regionalId, f)) {
      for (const i of ITEMS_NOTA.get(n.id) ?? []) {
        if (f.lineaId && PRODUCTOS.find((p) => p.id === i.producto_id)?.linea_id !== f.lineaId) continue
        const g = grupos.get(i.producto_id) ?? { producto_id: i.producto_id, producto: i.producto_nombre, linea: i.linea_nombre, unidades: 0, bs_netos: 0 }
        g.unidades += i.cantidad
        g.bs_netos = redondear(g.bs_netos + i.subtotal * (1 - n.descuento_pct / 100))
        grupos.set(i.producto_id, g)
      }
    }
    return responder([...grupos.values()].sort((a, b) => b.bs_netos - a.bs_netos).slice(0, LIMITE_TOP), opciones)
  },

  async rotacion(regionalId, f, opciones) {
    const dias = diasEntre(f.desde, f.hasta)
    const filas: RotacionProducto[] = []
    for (const p of PRODUCTOS) {
      const movs = MOVIMIENTOS.filter((m) => m.regional_id === regionalId && m.producto_id === p.id && m.fecha <= f.hasta)
      const inicial = suma(movs.filter((m) => m.fecha < f.desde).map((m) => m.cantidad))
      const final = suma(movs.map((m) => m.cantidad))
      const vendidas = -suma(movs.filter((m) => m.fecha >= f.desde && (m.tipo === 'venta' || m.tipo === 'anulacion')).map((m) => m.cantidad))
      if (!inicial && !final && !vendidas) continue
      const promedio = redondear((inicial + final) / 2)
      const rotacion = promedio > 0 ? redondear(vendidas / promedio) : 0
      filas.push({ producto_id: p.id, producto: p.nombre, linea: lineaDe(p.id), vendidas, stock_inicial: inicial, stock_final: final, stock_promedio: promedio, rotacion, dias_inventario: rotacion > 0 ? Math.round(dias / rotacion) : null })
    }
    return responder(filas.sort((a, b) => b.rotacion - a.rotacion), opciones)
  },

  // Las ventas por mes salen del mismo generador diario que el dashboard.
  async ventasRegional(f, opciones) {
    const filas: VentaRegionalMes[] = []
    for (let mes = f.desde.slice(0, 7); mes <= f.hasta.slice(0, 7); mes = sumarMeses(mes, 1)) {
      const desde = `${mes}-01` < f.desde ? f.desde : `${mes}-01`
      const fin = finDeMes(`${mes}-01`)
      const hasta = fin > f.hasta ? f.hasta : fin
      for (const r of REGIONALES) filas.push({ regional_id: r.id, regional: r.nombre, mes, ventas_netas: ventasEnRango(r.id, desde, hasta) })
    }
    return responder(filas, opciones)
  },

  async movimientoPeriodo(regionalId, f, opciones) {
    const lineas = matriz(regionalId, f.desde, f.hasta)
    const filas = lineas.flatMap((l) => l.productos)
    const notas = notasDe(regionalId, { ...f, vendedorId: '', categoria: '' })
    const contado = notas.filter((n) => n.condicion_tipo === 'contado')
    const credito = notas.filter((n) => n.condicion_tipo === 'credito')
    return responder(
      {
        lineas,
        columnas_extra: { devolucion: filas.some((x) => x.devolucion), ajuste: filas.some((x) => x.ajuste) },
        pie: {
          contado_bruto: suma(contado.map((n) => n.bruto)),
          credito_bruto: suma(credito.map((n) => n.bruto)),
          descuento_contado: suma(contado.map((n) => n.descuento_bs)),
          descuento_credito: suma(credito.map((n) => n.descuento_bs)),
          contado_neto: suma(contado.map((n) => n.total)),
          credito_neto: suma(credito.map((n) => n.total)),
          total_ventas: suma(notas.map((n) => n.total)),
        },
      },
      opciones,
    )
  },
}

async function rpc<T>(nombre: string, parametros: Record<string, unknown>, opciones?: OpcionesPeticion): Promise<T> {
  let consulta = supabase().rpc(nombre, parametros)
  if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
  return dato<T>(await consulta)
}

const nulo = (valor: string) => valor || null

const supabaseImpl: ServicioReportes = {
  topClientes: (regionalId, f, o) =>
    rpc('reporte_top_clientes', { p_desde: f.desde, p_hasta: f.hasta, p_regional_id: regionalId, p_vendedor_id: nulo(f.vendedorId), p_categoria: nulo(f.categoria), p_limite: LIMITE_TOP }, o),
  productosVendidos: (regionalId, f, o) =>
    rpc('reporte_productos_vendidos', { p_desde: f.desde, p_hasta: f.hasta, p_regional_id: regionalId, p_linea_id: nulo(f.lineaId), p_vendedor_id: nulo(f.vendedorId), p_limite: LIMITE_TOP }, o),
  rotacion: (regionalId, f, o) => rpc('reporte_rotacion', { p_regional_id: regionalId, p_desde: f.desde, p_hasta: f.hasta }, o),
  ventasRegional: (f, o) => rpc('reporte_ventas_regional', { p_desde: f.desde, p_hasta: f.hasta }, o),
  movimientoPeriodo: (regionalId, f, o) => rpc('reporte_movimiento_periodo', { p_regional_id: regionalId, p_desde: f.desde, p_hasta: f.hasta }, o),
}

export const reportesService: ServicioReportes = MODO_FIXTURES ? fixtures : supabaseImpl
