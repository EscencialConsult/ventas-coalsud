import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { DocumentoInventario, FilaKardex, SaldoVendedor } from '@/core/models/inventario'
import { POR_PAGINA } from '@/core/models/maestros'
import { auditar } from '@/fixtures/auditoria'
import { ahoraBolivia, aplicarAlStock, crearDocumento, diaCerrado, DOCUMENTOS, efectosDe, MOVIMIENTOS, saldoDe } from '@/fixtures/inventario'
import { esperar, responder } from '@/fixtures/latencia'
import { ALMACENES, PRODUCTOS, STOCK } from '@/fixtures/maestros'
import { REGIONALES, VENDEDORES } from '@/fixtures/organizacion'
import { exigirRegionalPropia, limpio, regionalesLegibles } from '@/fixtures/sesion'
import { HOY } from '@/fixtures/ventas'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha } from '@/shared/format/fecha'
import type { ServicioInventario } from './inventario.service'

const recientePrimero = <T extends { fecha: string; created_at: string }>(a: T, b: T) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at)
const paginar = <T>(filas: T[], pagina: number) => ({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filas.length })
const nombreRegional = (id: string) => REGIONALES.find((r) => r.id === id)?.nombre ?? ''

// Imita las RPC de inventario (Contrato §5.1) y sus triggers: día cerrado,
// stock que no puede quedar negativo y numeración por regional.
export const inventarioFixtures: ServicioInventario = {
  async stock(regionalId, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const filas = STOCK.filter((s) => regionales.includes(s.regional_id) && (s.ubicacion === 'almacen' || s.cantidad > 0))
    return responder(filas.sort((a, b) => a.orden - b.orden), opciones)
  },

  async kardex({ almacenId, vendedorId, productoId, desde, hasta }, opciones) {
    const movimientos = MOVIMIENTOS.filter((m) => m.almacen_id === almacenId && m.vendedor_id === vendedorId && m.producto_id === productoId && m.fecha <= hasta).sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at),
    )
    let saldo = 0
    const filas: FilaKardex[] = []
    for (const m of movimientos) {
      const anterior = saldo
      saldo += m.cantidad
      if (m.fecha >= desde) filas.push({ id: m.id, fecha: m.fecha, tipo: m.tipo, documento: m.documento_numero, cantidad: m.cantidad, saldo_anterior: anterior, saldo_nuevo: saldo, usuario: m.usuario_nombre })
    }
    return responder(filas, opciones)
  },

  async movimientos(regionalId, f, pagina, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const documento = f.documento.trim().toLowerCase()
    const filas = MOVIMIENTOS.filter(
      (m) =>
        regionales.includes(m.regional_id) &&
        (!f.desde || m.fecha >= f.desde) &&
        (!f.hasta || m.fecha <= f.hasta) &&
        (!f.tipo || m.tipo === f.tipo) &&
        (!f.productoId || m.producto_id === f.productoId) &&
        (!documento || m.documento_numero.toLowerCase().includes(documento)),
    )
    return responder(paginar([...filas].sort(recientePrimero), pagina), opciones)
  },

  async documentos(regionalId, f, pagina, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const filas: DocumentoInventario[] = DOCUMENTOS.filter(
      (d) =>
        (regionales.includes(d.regional_id) || (d.regional_destino_id !== null && regionales.includes(d.regional_destino_id))) &&
        (!f.tipo || d.tipo === f.tipo) &&
        (!f.desde || d.fecha >= f.desde) &&
        (!f.hasta || d.fecha <= f.hasta),
    ).map(({ detalle: _detalle, ...doc }) => doc)
    return responder(paginar(filas.sort(recientePrimero), pagina), opciones)
  },

  async documento(id, opciones) {
    const regionales = regionalesLegibles(null)
    const doc = DOCUMENTOS.find((d) => d.id === id && (regionales.includes(d.regional_id) || (d.regional_destino_id !== null && regionales.includes(d.regional_destino_id))))
    if (!doc) {
      await esperar(opciones)
      throw new ErrorNegocio('NO_ENCONTRADO', 'El documento no existe o no tiene acceso.')
    }
    return responder(doc, opciones)
  },

  // Reglas de Cálculo §7.1.
  async saldoVendedores(regionalId, desde, hasta, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const grupos = new Map<string, SaldoVendedor>()
    for (const m of MOVIMIENTOS) {
      if (!m.vendedor_id || !regionales.includes(m.regional_id) || m.fecha > hasta) continue
      const clave = `${m.vendedor_id}|${m.producto_id}`
      const producto = PRODUCTOS.find((p) => p.id === m.producto_id)
      const fila = grupos.get(clave) ?? {
        vendedor_id: m.vendedor_id,
        vendedor: m.vendedor_nombre ?? '',
        producto_id: m.producto_id,
        producto: m.producto_nombre,
        saldo_inicial: 0,
        entregado: 0,
        vendido: 0,
        retornado: 0,
        saldo_final: 0,
        valorizado: 0,
      }
      if (m.fecha < desde) fila.saldo_inicial += m.cantidad
      else if (m.tipo === 'salida') fila.entregado += m.cantidad
      else if (m.tipo === 'venta' || m.tipo === 'anulacion') fila.vendido -= m.cantidad
      else if (m.tipo === 'retorno') fila.retornado -= m.cantidad
      fila.saldo_final += m.cantidad
      fila.valorizado = Math.round(fila.saldo_final * (producto?.precio_base ?? 0) * 100) / 100
      grupos.set(clave, fila)
    }
    const filas = [...grupos.values()].filter((f) => f.saldo_inicial || f.entregado || f.vendido || f.retornado || f.saldo_final)
    return responder(filas.sort((a, b) => a.vendedor.localeCompare(b.vendedor) || a.producto.localeCompare(b.producto)), opciones)
  },

  async registrar(doc) {
    await esperar()
    const almacen = ALMACENES.find((a) => a.id === doc.almacen_id)
    if (!almacen) throw new ErrorNegocio('NO_ENCONTRADO', 'El almacén no existe.')
    exigirRegionalPropia(almacen.regional_id)
    if (doc.fecha > HOY) throw new ErrorNegocio('FECHA_INVALIDA', 'La fecha no puede ser posterior a hoy.', { campo: 'fecha', fecha: doc.fecha, hoy: HOY })
    if (diaCerrado(almacen.regional_id, doc.fecha)) {
      throw new ErrorNegocio('DIA_CERRADO', `El día ${formatoFecha(doc.fecha)} de ${nombreRegional(almacen.regional_id)} está cerrado.`, { regional: nombreRegional(almacen.regional_id), fecha: doc.fecha })
    }

    if (doc.tipo === 'salida' || doc.tipo === 'retorno') {
      const vendedor = VENDEDORES.find((v) => v.id === doc.vendedor_id && v.regional_id === almacen.regional_id)
      if (!vendedor) throw new ErrorNegocio('VALIDACION', 'Elija el vendedor.', { campo: 'vendedor_id' })
      if (!vendedor.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', 'El vendedor está inactivo.', { campo: 'vendedor_id' })
    }
    if (doc.tipo === 'traspaso') {
      const destino = ALMACENES.find((a) => a.id === doc.almacen_destino_id)
      if (!destino || destino.regional_id === almacen.regional_id) throw new ErrorNegocio('VALIDACION', 'Elija un almacén de otra regional.', { campo: 'almacen_destino_id' })
      if (!destino.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', 'El almacén destino está inactivo.', { campo: 'almacen_destino_id' })
      if (diaCerrado(destino.regional_id, doc.fecha)) {
        throw new ErrorNegocio('DIA_CERRADO', `El día ${formatoFecha(doc.fecha)} de ${nombreRegional(destino.regional_id)} está cerrado.`, { regional: nombreRegional(destino.regional_id), fecha: doc.fecha })
      }
    }
    if (doc.tipo === 'ajuste' && !limpio(doc.motivo)) throw new ErrorNegocio('VALIDACION', 'El motivo es obligatorio.', { campo: 'motivo' })

    if (!doc.items.length) throw new ErrorNegocio('VALIDACION', 'Agregue al menos un producto.')
    if (new Set(doc.items.map((i) => i.producto_id)).size !== doc.items.length) throw new ErrorNegocio('VALIDACION', 'Hay productos repetidos.')
    for (const item of doc.items) {
      const producto = PRODUCTOS.find((p) => p.id === item.producto_id)
      if (!producto) throw new ErrorNegocio('NO_ENCONTRADO', 'El producto no existe.')
      if (!producto.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', `${producto.nombre} está inactivo.`, { producto_id: producto.id })
      const valida = doc.tipo === 'ajuste' ? item.cantidad !== 0 : item.cantidad > 0
      if (!valida) throw new ErrorNegocio('VALIDACION', doc.tipo === 'ajuste' ? 'La cantidad no puede ser 0.' : 'La cantidad debe ser mayor a 0.', { producto_id: producto.id })
    }

    // tg_mov_actualiza_saldo: ningún saldo puede quedar negativo (todo o nada).
    const efectos = efectosDe(doc)
    for (const e of efectos) {
      const disponible = saldoDe(e.almacen_id, e.vendedor_id, e.producto_id)
      if (disponible + e.cantidad < 0) {
        const producto = PRODUCTOS.find((p) => p.id === e.producto_id)?.nombre ?? ''
        throw new ErrorNegocio('STOCK_INSUFICIENTE', `No alcanza el stock de ${producto}: disponible ${formatoCantidad(disponible)}.`, {
          producto_id: e.producto_id,
          producto,
          disponible,
          solicitado: -e.cantidad,
          ubicacion: e.vendedor_id ? 'vendedor' : 'almacen',
        })
      }
    }

    const nuevo = crearDocumento({ ...doc, referencia: limpio(doc.referencia), motivo: limpio(doc.motivo) }, perfilDemoActual()?.nombre ?? 'Sistema', ahoraBolivia())
    for (const e of efectos) aplicarAlStock(e)
    auditar({ regional_id: nuevo.regional_id, entidad: 'documento_inventario', entidad_id: nuevo.id, registro: nuevo.numero, accion: `registrar_${nuevo.tipo}` as const, datos: { numero: nuevo.numero, fecha: nuevo.fecha, items: nuevo.items, motivo: nuevo.motivo } })
    return responder({ id: nuevo.id, numero: nuevo.numero })
  },
}
