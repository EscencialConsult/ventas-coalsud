import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { Devolucion, MaxDevolvible } from '@/core/models/cobranzas'
import { POR_PAGINA } from '@/core/models/maestros'
import { auditar } from '@/fixtures/auditoria'
import { DEVOLUCIONES, ITEMS_DEVOLUCION, siguienteNumero } from '@/fixtures/cobranzas'
import { ahoraBolivia, diaCerrado, moverStockDevolucion } from '@/fixtures/inventario'
import { esperar, responder } from '@/fixtures/latencia'
import { exigirRegionalPropia, limpio, regionalesLegibles } from '@/fixtures/sesion'
import { HOY, ITEMS_NOTA, moverSaldo, NOTAS } from '@/fixtures/ventas'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoMonto, redondear } from '@/shared/format/moneda'
import { importeDevolucion } from './devoluciones.calculos'
import type { ServicioDevoluciones } from './devoluciones.service'

function situacion(notaId: string): MaxDevolvible {
  const nota = NOTAS.find((n) => n.id === notaId && regionalesLegibles(null).includes(n.regional_id))
  if (!nota) throw new ErrorNegocio('NO_ENCONTRADO', 'La nota no existe o no tiene acceso.')
  const previas = DEVOLUCIONES.filter((d) => d.nota_venta_id === notaId)
  const devuelto = (productoId: string) => previas.flatMap((d) => ITEMS_DEVOLUCION.get(d.id) ?? []).filter((i) => i.producto_id === productoId).reduce((t, i) => t + i.cantidad, 0)
  const reembolsado = previas.filter((d) => d.tipo_reverso === 'reembolso').reduce((t, d) => t + d.importe, 0)
  return {
    items: (ITEMS_NOTA.get(notaId) ?? []).map((i) => ({
      producto_id: i.producto_id,
      producto: i.producto_nombre,
      vendido: i.cantidad,
      devuelto: devuelto(i.producto_id),
      maximo: i.cantidad - devuelto(i.producto_id),
      precio_aplicado: i.precio_aplicado,
    })),
    dia_cerrado: diaCerrado(nota.regional_id, nota.fecha),
    saldo: nota.saldo,
    cobrado_neto: redondear(nota.cobrado - reembolsado),
  }
}

// Imita max_devolvible y registrar_devolucion (Contrato §5.2, Reglas §4).
export const devolucionesFixtures: ServicioDevoluciones = {
  async maxDevolvible(notaId, opciones) {
    await esperar(opciones)
    return structuredClone(situacion(notaId))
  },

  async registrar(d) {
    await esperar()
    const nota = NOTAS.find((n) => n.id === d.nota_id)
    if (!nota) throw new ErrorNegocio('NO_ENCONTRADO', 'La nota no existe.')
    exigirRegionalPropia(nota.regional_id)
    if (nota.estado === 'anulada') throw new ErrorNegocio('NOTA_ANULADA', 'La nota está anulada.')
    const s = situacion(nota.id)
    if (!s.dia_cerrado) throw new ErrorNegocio('DEVOLUCION_DIA_ABIERTO', 'El día de la nota sigue abierto: anúlela en vez de devolver.')
    if (diaCerrado(nota.regional_id, HOY)) throw new ErrorNegocio('DIA_CERRADO', 'El día de hoy ya está cerrado.')
    if (!limpio(d.motivo)) throw new ErrorNegocio('VALIDACION', 'El motivo es obligatorio.', { campo: 'motivo' })
    const items = d.items.filter((i) => i.cantidad > 0)
    if (!items.length) throw new ErrorNegocio('VALIDACION', 'Indique qué productos se devuelven.')
    for (const i of items) {
      const fila = s.items.find((x) => x.producto_id === i.producto_id)
      if (!fila || i.cantidad > fila.maximo) {
        throw new ErrorNegocio('DEVOLUCION_EXCEDE', `De ${fila?.producto ?? 'ese producto'} se pueden devolver hasta ${formatoCantidad(fila?.maximo ?? 0)}.`, { producto_id: i.producto_id, maximo: fila?.maximo ?? 0 })
      }
    }
    const conPrecio = items.map((i) => ({ ...i, precio_aplicado: s.items.find((x) => x.producto_id === i.producto_id)?.precio_aplicado ?? 0 }))
    const importe = importeDevolucion(conPrecio.map((i) => ({ cantidad: i.cantidad, precio: i.precio_aplicado })), nota.descuento_pct)
    if (d.tipo_reverso === 'abono_cuenta') {
      if (nota.condicion_tipo !== 'credito') throw new ErrorNegocio('ABONO_NO_PERMITIDO', 'El abono a cuenta es solo para notas a crédito.', { campo: 'tipo_reverso' })
      if (importe > s.saldo) throw new ErrorNegocio('ABONO_NO_PERMITIDO', `El abono supera el saldo de la nota (Bs ${formatoMonto(s.saldo)}).`, { campo: 'tipo_reverso' })
    } else if (nota.condicion_tipo === 'credito' && importe > s.cobrado_neto) {
      throw new ErrorNegocio('REEMBOLSO_EXCEDE_COBRADO', `Solo se cobró Bs ${formatoMonto(s.cobrado_neto)}: no se puede reembolsar más.`, { campo: 'tipo_reverso' })
    }

    const creado = ahoraBolivia()
    const devolucion: Devolucion = {
      id: `dev-${Date.now().toString(36)}`,
      numero: siguienteNumero('DEV', nota.regional_id, DEVOLUCIONES),
      regional_id: nota.regional_id,
      fecha: HOY,
      nota_venta_id: nota.id,
      nota_numero: nota.numero,
      cliente_id: nota.cliente_id,
      cliente_nombre: nota.cliente_nombre,
      tipo_reverso: d.tipo_reverso,
      motivo: limpio(d.motivo) ?? '',
      importe,
      nc_contable_numero: null,
      usuario_nombre: perfilDemoActual()?.nombre ?? 'Sistema',
      created_at: creado,
    }
    DEVOLUCIONES.push(devolucion)
    auditar({ regional_id: devolucion.regional_id, entidad: 'devolucion', entidad_id: devolucion.id, registro: devolucion.numero, accion: 'registrar_devolucion', datos: { nota: nota.numero, tipo_reverso: devolucion.tipo_reverso, importe, motivo: devolucion.motivo } })
    ITEMS_DEVOLUCION.set(devolucion.id, conPrecio)
    moverStockDevolucion(devolucion, items, devolucion.usuario_nombre, creado)
    if (d.tipo_reverso === 'abono_cuenta') moverSaldo(nota.id, { abonado: importe })
    nota.tiene_devolucion = true
    return responder({ id: devolucion.id, numero: devolucion.numero, importe })
  },

  async listar(regionalId, f, pagina, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const filas = DEVOLUCIONES.filter(
      (d) => regionales.includes(d.regional_id) && (!f.desde || d.fecha >= f.desde) && (!f.hasta || d.fecha <= f.hasta) && (!f.tipo || d.tipo_reverso === f.tipo),
    ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero))
    return responder({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filas.length }, opciones)
  },

  async deNota(notaId, opciones) {
    return responder(DEVOLUCIONES.filter((d) => d.nota_venta_id === notaId), opciones)
  },

  async registrarNc(id, numero) {
    await esperar()
    const devolucion = DEVOLUCIONES.find((d) => d.id === id)
    if (!devolucion) throw new ErrorNegocio('NO_ENCONTRADO', 'La devolución no existe.')
    exigirRegionalPropia(devolucion.regional_id)
    const valor = limpio(numero)
    if (!valor) throw new ErrorNegocio('VALIDACION', 'Ingrese el N° de la nota de crédito.', { campo: 'numero' })
    devolucion.nc_contable_numero = valor
    return responder({ id, nc_contable_numero: valor })
  },
}
