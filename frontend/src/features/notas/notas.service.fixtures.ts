import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import { POR_PAGINA } from '@/core/models/maestros'
import type { HojaCarga, NotaVenta } from '@/core/models/nota-venta'
import { auditar } from '@/fixtures/auditoria'
import { ahoraBolivia, diaCerrado, moverStockNota, saldoDe } from '@/fixtures/inventario'
import { esperar, responder } from '@/fixtures/latencia'
import { ALMACENES, CLIENTES, CONDICIONES, LINEAS, PRODUCTOS } from '@/fixtures/maestros'
import { REGIONALES, VENDEDORES } from '@/fixtures/organizacion'
import { exigirRegionalPropia, limpio, mismoTexto, regionalesLegibles } from '@/fixtures/sesion'
import { HOY, itemNota, ITEMS_NOTA, NOTAS, SALDOS, saldoDeNota, type NotaFila } from '@/fixtures/ventas'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha, sumarDias } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { normalizar } from '@/shared/format/texto'
import { calcularTotales } from './notas.calculos'
import { MAX_PDF_BYTES, type ServicioNotas } from './notas.service'

/** PDFs "subidos" en la demo (el bucket `facturas`, en memoria). */
const ARCHIVOS = new Map<string, Blob>()

const conDia = (n: NotaFila): NotaVenta => ({ ...n, dia_cerrado: diaCerrado(n.regional_id, n.fecha) })
const legible = (n: NotaFila) => regionalesLegibles(null).includes(n.regional_id)
const usuario = () => perfilDemoActual()?.nombre ?? 'Sistema'
const ordenProducto = (id: string) => {
  const p = PRODUCTOS.find((x) => x.id === id)
  return (LINEAS.find((l) => l.id === p?.linea_id)?.orden ?? 0) * 1000 + (p?.orden ?? 0)
}

function buscarNota(id: string): NotaFila {
  const nota = NOTAS.find((n) => n.id === id && legible(n))
  if (!nota) throw new ErrorNegocio('NO_ENCONTRADO', 'La nota no existe o no tiene acceso.')
  return nota
}

// Imita v_nota_venta y las RPC de ventas (Contrato §5.2) con sus validaciones.
export const notasFixtures: ServicioNotas = {
  async listar(regionalId, f, pagina, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const q = normalizar(f.q.trim())
    const filas = NOTAS.filter(
      (n) =>
        regionales.includes(n.regional_id) &&
        (!f.desde || n.fecha >= f.desde) &&
        (!f.hasta || n.fecha <= f.hasta) &&
        (!f.estado || n.estado === f.estado) &&
        (!f.vendedorId || n.vendedor_id === f.vendedorId) &&
        (!f.condicion || n.condicion_tipo === f.condicion) &&
        (!f.sinFactura || n.pendiente_factura) &&
        (!q || [n.numero, n.numero_factura ?? '', n.cliente_nombre].some((t) => normalizar(t).includes(q))),
    ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero))
    return responder({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(conDia), total: filas.length }, opciones)
  },

  async obtener(id, opciones) {
    await esperar(opciones)
    const nota = buscarNota(id)
    return structuredClone({ ...conDia(nota), items: ITEMS_NOTA.get(id) ?? [] })
  },

  async emitir(n) {
    await esperar()
    exigirRegionalPropia(n.regional_id)
    if (n.fecha > HOY) throw new ErrorNegocio('FECHA_INVALIDA', 'La fecha no puede ser posterior a hoy.', { campo: 'fecha', fecha: n.fecha, hoy: HOY })
    if (diaCerrado(n.regional_id, n.fecha)) throw new ErrorNegocio('DIA_CERRADO', `El día ${formatoFecha(n.fecha)} ya está cerrado.`, { campo: 'fecha', fecha: n.fecha })
    const cliente = CLIENTES.find((c) => c.id === n.cliente_id && c.regional_id === n.regional_id)
    if (!cliente) throw new ErrorNegocio('VALIDACION', 'Elija el cliente.', { campo: 'cliente_id' })
    if (!cliente.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', 'El cliente está inactivo.', { campo: 'cliente_id' })
    const vendedor = VENDEDORES.find((v) => v.id === n.vendedor_id && v.regional_id === n.regional_id)
    if (!vendedor) throw new ErrorNegocio('VALIDACION', 'Elija el vendedor.', { campo: 'vendedor_id' })
    if (!vendedor.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', 'El vendedor está inactivo.', { campo: 'vendedor_id' })
    const condicion = CONDICIONES.find((c) => c.id === n.condicion_pago_id)
    if (!condicion) throw new ErrorNegocio('VALIDACION', 'Elija la condición de pago.', { campo: 'condicion_pago_id' })
    if (!condicion.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', 'La condición de pago está inactiva.', { campo: 'condicion_pago_id' })
    if (!(n.descuento_pct >= 0 && n.descuento_pct <= 100)) throw new ErrorNegocio('VALIDACION', 'El descuento va de 0 a 100 %.', { campo: 'descuento_pct' })
    if (!n.items.length) throw new ErrorNegocio('VALIDACION', 'Agregue al menos un producto.')
    if (new Set(n.items.map((i) => i.producto_id)).size !== n.items.length) throw new ErrorNegocio('VALIDACION', 'Hay productos repetidos.')

    // Stock del origen elegido (almacén o saldo del vendedor): nunca negativo.
    const almacenId = ALMACENES.find((a) => a.regional_id === n.regional_id)?.id ?? ''
    const items = n.items.map((i) => {
      const producto = PRODUCTOS.find((p) => p.id === i.producto_id)
      if (!producto) throw new ErrorNegocio('NO_ENCONTRADO', 'El producto no existe.')
      if (!producto.activo) throw new ErrorNegocio('REGISTRO_INACTIVO', `${producto.nombre} está inactivo.`, { producto_id: producto.id })
      if (!(i.cantidad > 0)) throw new ErrorNegocio('VALIDACION', 'La cantidad debe ser mayor a 0.', { producto_id: producto.id })
      if (!(i.precio_aplicado >= 0)) throw new ErrorNegocio('VALIDACION', 'El precio no puede ser negativo.', { producto_id: producto.id })
      const disponible = saldoDe(almacenId, n.origen_stock === 'vendedor' ? vendedor.id : null, producto.id)
      if (i.cantidad > disponible) {
        throw new ErrorNegocio('STOCK_INSUFICIENTE', `No alcanza el stock de ${producto.nombre}: disponible ${formatoCantidad(disponible)}.`, {
          producto_id: producto.id,
          producto: producto.nombre,
          disponible,
          solicitado: i.cantidad,
          ubicacion: n.origen_stock,
        })
      }
      return itemNota(producto, i.cantidad, i.precio_aplicado)
    })

    const regional = REGIONALES.find((r) => r.id === n.regional_id)
    const ultimo = Math.max(0, ...NOTAS.filter((x) => x.regional_id === n.regional_id).map((x) => Number(x.numero.split('-')[1]) || 0))
    const totales = calcularTotales(items.map((i) => ({ cantidad: i.cantidad, precio: i.precio_aplicado })), n.descuento_pct)
    const creado = ahoraBolivia()
    const fila: NotaFila = {
      id: `nv-${Date.now().toString(36)}`,
      numero: `${regional?.codigo ?? '?'}-${String(ultimo + 1).padStart(4, '0')}`,
      regional_id: n.regional_id,
      regional_codigo: regional?.codigo ?? '',
      fecha: n.fecha,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_nit: cliente.nit,
      vendedor_id: vendedor.id,
      vendedor_nombre: vendedor.nombre,
      canal: n.canal,
      condicion_pago_id: condicion.id,
      condicion_tipo: condicion.tipo,
      condicion_nombre: condicion.nombre,
      dias_credito: condicion.dias,
      fecha_vencimiento: sumarDias(n.fecha, condicion.dias),
      descuento_pct: n.descuento_pct,
      origen_stock: n.origen_stock,
      numero_factura: limpio(n.numero_factura),
      factura_pdf_path: null,
      estado: 'emitida',
      motivo_anulacion: null,
      anulada_en: null,
      observaciones: limpio(n.observaciones),
      bruto: totales.bruto,
      descuento_bs: totales.descuento,
      total: totales.total,
      cobrado: 0,
      abonado: 0,
      saldo: condicion.tipo === 'credito' ? totales.total : 0,
      pendiente_factura: !limpio(n.numero_factura),
      tiene_devolucion: false,
      usuario_nombre: usuario(),
      created_at: creado,
    }
    NOTAS.push(fila)
    const base = { regional_id: fila.regional_id, entidad: 'nota_venta' as const, entidad_id: fila.id, registro: fila.numero }
    auditar({ ...base, accion: 'emitir_nota', datos: { despues: { cliente: fila.cliente_nombre, total: fila.total, condicion: fila.condicion_nombre } } })
    for (const i of items) if (i.precio_aplicado !== i.precio_base) auditar({ ...base, accion: 'cambio_precio', datos: { producto: i.producto_nombre, antes: i.precio_base, despues: i.precio_aplicado } })
    if (fila.descuento_pct > 0) auditar({ ...base, accion: 'descuento', datos: { descuento_pct: fila.descuento_pct, descuento_bs: fila.descuento_bs } })
    ITEMS_NOTA.set(fila.id, items)
    moverStockNota(fila, items, 'venta', usuario(), creado)
    if (fila.saldo > 0) SALDOS.push(saldoDeNota(fila))
    return responder({ id: fila.id, numero: fila.numero, bruto: fila.bruto, descuento_bs: fila.descuento_bs, total: fila.total })
  },

  async registrarFactura({ id }, numero, pdf) {
    await esperar()
    const nota = buscarNota(id)
    exigirRegionalPropia(nota.regional_id)
    if (nota.estado === 'anulada') throw new ErrorNegocio('NOTA_ANULADA', 'La nota está anulada.')
    const valor = limpio(numero)
    if (!valor || valor.length > 30) throw new ErrorNegocio('VALIDACION', 'Ingrese el N° de factura (hasta 30 caracteres).', { campo: 'numero_factura' })
    let ruta = nota.factura_pdf_path
    if (pdf) {
      if (pdf.type !== 'application/pdf' || pdf.size > MAX_PDF_BYTES) throw new ErrorNegocio('VALIDACION', 'El archivo debe ser un PDF de hasta 10 MB.', { campo: 'pdf' })
      ruta = `${nota.regional_id}/${nota.id}.pdf`
      ARCHIVOS.set(ruta, pdf)
    }
    // ⚠ SUP-41: el N° repetido se acepta, con advertencia.
    const duplicado = NOTAS.some((o) => o.id !== nota.id && o.regional_id === nota.regional_id && o.estado === 'emitida' && o.numero_factura !== null && mismoTexto(o.numero_factura, valor))
    auditar({ regional_id: nota.regional_id, entidad: 'nota_venta', entidad_id: nota.id, registro: nota.numero, accion: 'registrar_factura', datos: { antes: { numero_factura: nota.numero_factura }, despues: { numero_factura: valor, pdf: ruta } } })
    Object.assign(nota, { numero_factura: valor, factura_pdf_path: ruta, pendiente_factura: false })
    for (const s of SALDOS) if (s.documento_id === nota.id) s.numero_factura = valor
    return responder({ id: nota.id, numero_factura: valor, factura_pdf_path: ruta, advertencia_duplicado: duplicado })
  },

  async urlFactura(ruta) {
    await esperar()
    const archivo = ARCHIVOS.get(ruta)
    if (!archivo) throw new ErrorNegocio('NO_ENCONTRADO', 'El PDF no está disponible en esta demostración.')
    const url = URL.createObjectURL(archivo)
    // Como la URL firmada: vale un rato.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return url
  },

  async anular(id, motivo) {
    await esperar()
    const nota = buscarNota(id)
    exigirRegionalPropia(nota.regional_id)
    if (nota.estado === 'anulada') throw new ErrorNegocio('NOTA_ANULADA', 'La nota ya está anulada.')
    if (diaCerrado(nota.regional_id, nota.fecha)) throw new ErrorNegocio('NOTA_NO_ANULABLE', 'El día de la nota está cerrado: use Devolver.')
    if (nota.cobrado > 0) throw new ErrorNegocio('NOTA_NO_ANULABLE', 'Tiene cobranzas vigentes: anúlelas primero.')
    const creado = ahoraBolivia()
    Object.assign(nota, { estado: 'anulada', motivo_anulacion: limpio(motivo), anulada_en: creado, saldo: 0, pendiente_factura: false })
    moverStockNota(nota, ITEMS_NOTA.get(nota.id) ?? [], 'anulacion', usuario(), creado)
    auditar({ regional_id: nota.regional_id, entidad: 'nota_venta', entidad_id: nota.id, registro: nota.numero, accion: 'anular_nota', datos: { motivo: nota.motivo_anulacion, factura: nota.numero_factura } })
    const indice = SALDOS.findIndex((s) => s.documento_id === nota.id)
    if (indice >= 0) SALDOS.splice(indice, 1)
    return responder({ id: nota.id, estado: nota.estado, aviso_factura: nota.numero_factura ? `Avise a Contabilidad que anule la factura ${nota.numero_factura}.` : null })
  },

  async hojaCarga(regionalId, fecha, vendedorId, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const grupos = new Map<string, HojaCarga>()
    const notas = NOTAS.filter((n) => regionales.includes(n.regional_id) && n.fecha === fecha && n.estado === 'emitida' && n.vendedor_id && (!vendedorId || n.vendedor_id === vendedorId))
    for (const n of notas.sort((a, b) => a.numero.localeCompare(b.numero))) {
      const id = n.vendedor_id ?? ''
      const hoja = grupos.get(id) ?? { vendedor_id: id, vendedor: n.vendedor_nombre, productos: [], notas: [], totales: { unidades: 0, bruto: 0, descuento: 0, neto: 0 } }
      for (const i of ITEMS_NOTA.get(n.id) ?? []) {
        const fila = hoja.productos.find((p) => p.producto_id === i.producto_id)
        if (fila) {
          fila.cantidad += i.cantidad
          fila.bs = redondear(fila.bs + i.subtotal)
        } else hoja.productos.push({ producto_id: i.producto_id, producto: i.producto_nombre, linea: i.linea_nombre, cantidad: i.cantidad, bs: i.subtotal })
        hoja.totales.unidades += i.cantidad
      }
      hoja.notas.push({ id: n.id, numero: n.numero, cliente: n.cliente_nombre, zona: CLIENTES.find((c) => c.id === n.cliente_id)?.zona ?? null, condicion: n.condicion_nombre, total: n.total })
      hoja.totales.bruto = redondear(hoja.totales.bruto + n.bruto)
      hoja.totales.descuento = redondear(hoja.totales.descuento + n.descuento_bs)
      hoja.totales.neto = redondear(hoja.totales.neto + n.total)
      grupos.set(id, hoja)
    }
    const hojas = [...grupos.values()].sort((a, b) => a.vendedor.localeCompare(b.vendedor))
    for (const h of hojas) h.productos.sort((a, b) => ordenProducto(a.producto_id) - ordenProducto(b.producto_id))
    return responder(hojas, opciones)
  },
}
