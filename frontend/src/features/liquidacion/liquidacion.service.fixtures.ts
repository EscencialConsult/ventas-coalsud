import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { FormaPago } from '@/core/models/cobranzas'
import type { FilaLiquidacion, Liquidacion, LineaLiquidacion, PieLiquidacion, ReporteLiquidacion } from '@/core/models/liquidacion'
import { POR_PAGINA } from '@/core/models/maestros'
import { auditar } from '@/fixtures/auditoria'
import { COBRANZAS, DEVOLUCIONES } from '@/fixtures/cobranzas'
import { ahoraBolivia, diaCerrado, DOCUMENTOS, MOVIMIENTOS } from '@/fixtures/inventario'
import { esperar, responder } from '@/fixtures/latencia'
import { LINEAS, PRODUCTOS } from '@/fixtures/maestros'
import { REGIONALES, usuarioDe } from '@/fixtures/organizacion'
import { exigirNacional, exigirRegionalPropia, limpio, regionalesLegibles } from '@/fixtures/sesion'
import { HOY, ITEMS_NOTA, LIQUIDACIONES_ABIERTAS, NOTAS } from '@/fixtures/ventas'
import { formatoFecha, sumarDias } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import type { ServicioLiquidacion } from './liquidacion.service'

/** Quién y cuándo cerró los días cerrados durante la demo (los anteriores: el regional, a las 20:30). */
const CIERRES = new Map<string, { por: string; en: string }>()
const clave = (regionalId: string, fecha: string) => `${regionalId}|${fecha}`
const suma = (valores: number[]) => redondear(valores.reduce((t, v) => t + v, 0))

function cierre(regionalId: string, fecha: string) {
  if (!diaCerrado(regionalId, fecha)) return { por: null, en: null }
  const c = CIERRES.get(clave(regionalId, fecha))
  return { por: c?.por ?? usuarioDe(regionalId), en: c?.en ?? `${fecha}T20:30:00-04:00` }
}

function ultimoCerrado(regionalId: string): string | null {
  for (let d = HOY, i = 0; i < 400; d = sumarDias(d, -1), i++) if (diaCerrado(regionalId, d)) return d
  return null
}

const abiertosAntes = (regionalId: string, fecha: string) =>
  LIQUIDACIONES_ABIERTAS.filter((l) => l.regional_id === regionalId && l.fecha < fecha)
    .map((l) => l.fecha)
    .sort()

/** Pie y arqueo (Reglas §3.2–3.3): alcanza con notas, cobranzas y devoluciones. */
function totales(regionalId: string, fecha: string) {
  const notas = NOTAS.filter((n) => n.regional_id === regionalId && n.fecha === fecha && n.estado === 'emitida')
  const contado = notas.filter((n) => n.condicion_tipo === 'contado')
  const credito = notas.filter((n) => n.condicion_tipo === 'credito')
  const cobros = COBRANZAS.filter((c) => c.regional_id === regionalId && c.fecha === fecha && c.estado === 'vigente')
  const pie: PieLiquidacion = {
    contado_bruto: suma(contado.map((n) => n.bruto)),
    credito_bruto: suma(credito.map((n) => n.bruto)),
    descuento_contado: suma(contado.map((n) => n.descuento_bs)),
    descuento_credito: suma(credito.map((n) => n.descuento_bs)),
    contado_neto: suma(contado.map((n) => n.total)),
    credito_neto: suma(credito.map((n) => n.total)),
    total_ventas: suma(notas.map((n) => n.total)),
  }
  const cobranzas = suma(cobros.map((c) => c.importe))
  const reembolsos = suma(DEVOLUCIONES.filter((d) => d.regional_id === regionalId && d.fecha === fecha && d.tipo_reverso === 'reembolso').map((d) => d.importe))
  const formas = [...new Set(cobros.map((c) => c.forma_pago))] as FormaPago[]
  return {
    pie,
    arqueo: {
      contado: pie.contado_neto,
      credito: pie.credito_neto,
      cobranzas,
      reembolsos,
      total_ventas: pie.total_ventas,
      total_efectivo: redondear(pie.contado_neto + cobranzas - reembolsos),
      cobranzas_por_forma: formas.map((forma_pago) => ({ forma_pago, importe: suma(cobros.filter((c) => c.forma_pago === forma_pago).map((c) => c.importe)) })),
    },
  }
}

/**
 * Matriz por producto (Reglas §3.1): saldo inicial, movimientos y ventas de las
 * notas emitidas. Un día (liquidación) o un período acumulado (⚠ SUP-54).
 */
export function matriz(regionalId: string, desde: string, hasta: string): LineaLiquidacion[] {
  const movimientos = new Map<string, typeof MOVIMIENTOS>()
  for (const m of MOVIMIENTOS) if (m.regional_id === regionalId && m.fecha <= hasta) movimientos.set(m.producto_id, [...(movimientos.get(m.producto_id) ?? []), m])
  const ventas = new Map<string, { cq: number; cbs: number; rq: number; rbs: number }>()
  for (const n of NOTAS.filter((x) => x.regional_id === regionalId && x.fecha >= desde && x.fecha <= hasta && x.estado === 'emitida')) {
    for (const i of ITEMS_NOTA.get(n.id) ?? []) {
      const v = ventas.get(i.producto_id) ?? { cq: 0, cbs: 0, rq: 0, rbs: 0 }
      if (n.condicion_tipo === 'contado') Object.assign(v, { cq: v.cq + i.cantidad, cbs: redondear(v.cbs + i.subtotal) })
      else Object.assign(v, { rq: v.rq + i.cantidad, rbs: redondear(v.rbs + i.subtotal) })
      ventas.set(i.producto_id, v)
    }
  }
  const delDia = (lista: typeof MOVIMIENTOS, tipos: string[]) => suma(lista.filter((m) => m.fecha >= desde && tipos.includes(m.tipo)).map((m) => m.cantidad))

  return [...LINEAS]
    .sort((a, b) => a.orden - b.orden)
    .map((linea) => {
      const productos: FilaLiquidacion[] = PRODUCTOS.filter((p) => p.linea_id === linea.id)
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
        .map((p) => {
          const lista = movimientos.get(p.id) ?? []
          const v = ventas.get(p.id) ?? { cq: 0, cbs: 0, rq: 0, rbs: 0 }
          const fila = {
            saldo_inicial: suma(lista.filter((m) => m.fecha < desde).map((m) => m.cantidad)),
            pedido: delDia(lista, ['ingreso']),
            traspaso: delDia(lista, ['traspaso_entrada', 'traspaso_salida']),
            devolucion: delDia(lista, ['devolucion']),
            ajuste: delDia(lista, ['ajuste']),
          }
          const totalQ = v.cq + v.rq
          return {
            producto_id: p.id,
            producto: p.nombre,
            orden: p.orden,
            precio_unit: p.precio_base,
            ...fila,
            venta_contado_q: v.cq,
            venta_contado_bs: v.cbs,
            venta_credito_q: v.rq,
            venta_credito_bs: v.rbs,
            total_ventas_q: totalQ,
            total_ventas_bs: redondear(v.cbs + v.rbs),
            saldo_final: redondear(fila.saldo_inicial + fila.pedido + fila.traspaso + fila.devolucion + fila.ajuste - totalQ),
            con_movimiento: Boolean(fila.pedido || fila.traspaso || fila.devolucion || fila.ajuste || totalQ),
            activo: p.activo,
          }
        })
        // Inactivos solo si tienen algo en el día.
        .filter(({ activo, con_movimiento }) => activo || con_movimiento)
        .map(({ activo: _activo, ...fila }) => fila)
      return { linea_id: linea.id, linea: linea.nombre, orden_linea: linea.orden, productos }
    })
    .filter((l) => l.productos.length)
}

function reporte(regionalId: string, fecha: string): ReporteLiquidacion {
  const regional = REGIONALES.find((r) => r.id === regionalId)
  if (!regional || !regionalesLegibles(null).includes(regionalId)) throw new ErrorNegocio('NO_AUTORIZADO', 'No tiene acceso a esa regional.')
  const lineas = matriz(regionalId, fecha, fecha)
  const filas = lineas.flatMap((l) => l.productos)
  const { pie, arqueo } = totales(regionalId, fecha)
  const notas = NOTAS.filter((n) => n.regional_id === regionalId && n.fecha === fecha)
  const emitidas = notas.filter((n) => n.estado === 'emitida')
  const { por, en } = cierre(regionalId, fecha)
  return {
    regional: { id: regional.id, codigo: regional.codigo, nombre: regional.nombre },
    fecha,
    estado: diaCerrado(regionalId, fecha) ? 'cerrada' : 'abierta',
    cerrada_por: por,
    cerrada_en: en,
    ultimo_cerrado: ultimoCerrado(regionalId),
    columnas_extra: { devolucion: filas.some((f) => f.devolucion), ajuste: filas.some((f) => f.ajuste) },
    lineas,
    pie,
    arqueo,
    // Las anuladas, al final (⚠ SUP-46).
    notas: [...emitidas, ...notas.filter((n) => n.estado === 'anulada')].map((n) => ({
      id: n.id,
      numero: n.numero,
      numero_factura: n.numero_factura,
      cliente: n.cliente_nombre,
      vendedor: n.vendedor_nombre,
      condicion: n.condicion_tipo,
      total: n.total,
      estado: n.estado,
    })),
    subtotales_notas: { contado: pie.contado_neto, credito: pie.credito_neto, total: pie.total_ventas, cantidad: emitidas.length },
    cobranzas: COBRANZAS.filter((c) => c.regional_id === regionalId && c.fecha === fecha && c.estado === 'vigente').map((c) => ({
      id: c.id,
      numero: c.numero,
      cliente: c.cliente_nombre,
      documento: c.tipo_doc === 'saldo_inicial' ? `Saldo inicial ${c.documento_numero}` : [c.documento_numero, c.numero_factura].filter(Boolean).join(' / '),
      forma_pago: c.forma_pago,
      referencia: c.referencia_pago,
      importe: c.importe,
    })),
    devoluciones: DEVOLUCIONES.filter((d) => d.regional_id === regionalId && d.fecha === fecha).map((d) => ({
      id: d.id,
      numero: d.numero,
      nota: d.nota_numero,
      cliente: d.cliente_nombre,
      tipo_reverso: d.tipo_reverso,
      importe: d.importe,
    })),
    validaciones_cierre: {
      dias_anteriores_abiertos: abiertosAntes(regionalId, fecha),
      notas_sin_factura: emitidas.filter((n) => n.pendiente_factura).map((n) => ({ id: n.id, numero: n.numero, cliente: n.cliente_nombre, total: n.total })),
    },
  }
}

// Imita reporte_liquidacion, cerrar/reabrir y v_liquidacion. En la demo el
// reporte de un día cerrado se recalcula (no cambia: todo lo bloquea el día cerrado).
export const liquidacionFixtures: ServicioLiquidacion = {
  async reporte(regionalId, fecha, opciones) {
    await esperar(opciones)
    return structuredClone(reporte(regionalId, fecha))
  },

  async cerrar(regionalId, fecha) {
    await esperar()
    exigirRegionalPropia(regionalId)
    if (fecha > HOY) throw new ErrorNegocio('FECHA_INVALIDA', 'No se puede cerrar un día futuro.')
    if (diaCerrado(regionalId, fecha)) throw new ErrorNegocio('DIA_CERRADO', `El día ${formatoFecha(fecha)} ya está cerrado.`)
    const anteriores = abiertosAntes(regionalId, fecha)
    if (anteriores.length) throw new ErrorNegocio('DIA_ANTERIOR_ABIERTO', `Primero cierre el ${formatoFecha(anteriores[0])}.`, { fechas: anteriores })
    const pendientes = NOTAS.filter((n) => n.regional_id === regionalId && n.fecha === fecha && n.pendiente_factura)
    if (pendientes.length) throw new ErrorNegocio('FACTURA_PENDIENTE', `Faltan ${pendientes.length} facturas.`, { notas: pendientes.map((n) => n.numero) })
    const indice = LIQUIDACIONES_ABIERTAS.findIndex((l) => l.regional_id === regionalId && l.fecha === fecha)
    if (indice >= 0) LIQUIDACIONES_ABIERTAS.splice(indice, 1)
    CIERRES.set(clave(regionalId, fecha), { por: perfilDemoActual()?.nombre ?? 'Sistema', en: ahoraBolivia() })
    auditar({ regional_id: regionalId, entidad: 'liquidacion', entidad_id: clave(regionalId, fecha), registro: fecha, accion: 'cerrar_dia', datos: { fecha, totales: { total_ventas: totales(regionalId, fecha).pie.total_ventas } } })
    return responder({ id: clave(regionalId, fecha), estado: 'cerrada' as const, totales: totales(regionalId, fecha).pie })
  },

  async reabrir(regionalId, fecha, motivo) {
    await esperar()
    exigirNacional()
    if (!diaCerrado(regionalId, fecha)) throw new ErrorNegocio('REAPERTURA_NO_PERMITIDA', 'El día está abierto.')
    const ultimo = ultimoCerrado(regionalId)
    if (ultimo !== fecha) throw new ErrorNegocio('REAPERTURA_NO_PERMITIDA', `Solo se puede reabrir el ${formatoFecha(ultimo ?? fecha)}.`)
    if (!limpio(motivo)) throw new ErrorNegocio('VALIDACION', 'El motivo es obligatorio.', { campo: 'motivo' })
    LIQUIDACIONES_ABIERTAS.push({ regional_id: regionalId, fecha })
    CIERRES.delete(clave(regionalId, fecha))
    auditar({ regional_id: regionalId, entidad: 'liquidacion', entidad_id: clave(regionalId, fecha), registro: fecha, accion: 'reabrir_dia', datos: { motivo: limpio(motivo) } })
    return responder({ id: clave(regionalId, fecha), estado: 'abierta' as const })
  },

  async historial(regionalId, f, pagina, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const filas: Liquidacion[] = []
    for (const r of REGIONALES.filter((x) => regionales.includes(x.id))) {
      // Días con fila en `liquidacion`: los que tuvieron actividad y los abiertos.
      const dias = new Set([
        ...NOTAS.filter((n) => n.regional_id === r.id).map((n) => n.fecha),
        ...COBRANZAS.filter((c) => c.regional_id === r.id).map((c) => c.fecha),
        ...DEVOLUCIONES.filter((d) => d.regional_id === r.id).map((d) => d.fecha),
        ...DOCUMENTOS.filter((d) => d.regional_id === r.id || d.regional_destino_id === r.id).map((d) => d.fecha),
        ...LIQUIDACIONES_ABIERTAS.filter((l) => l.regional_id === r.id).map((l) => l.fecha),
      ])
      for (const fecha of dias) {
        const cerrada = diaCerrado(r.id, fecha)
        if ((f.desde && fecha < f.desde) || (f.hasta && fecha > f.hasta) || (f.estado && f.estado !== (cerrada ? 'cerrada' : 'abierta'))) continue
        const t = cerrada ? totales(r.id, fecha) : null
        const { por, en } = cierre(r.id, fecha)
        filas.push({
          id: clave(r.id, fecha),
          regional_id: r.id,
          regional_codigo: r.codigo,
          fecha,
          estado: cerrada ? 'cerrada' : 'abierta',
          total_contado_bruto: t?.pie.contado_bruto ?? null,
          total_credito_bruto: t?.pie.credito_bruto ?? null,
          descuento_contado: t?.pie.descuento_contado ?? null,
          descuento_credito: t?.pie.descuento_credito ?? null,
          total_cobranzas: t?.arqueo.cobranzas ?? null,
          total_reembolsos: t?.arqueo.reembolsos ?? null,
          total_ventas: t?.pie.total_ventas ?? null,
          total_efectivo: t?.arqueo.total_efectivo ?? null,
          cerrada_por_nombre: por,
          cerrada_en: en,
        })
      }
    }
    filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.regional_codigo.localeCompare(b.regional_codigo))
    return responder({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filas.length }, opciones)
  },
}
