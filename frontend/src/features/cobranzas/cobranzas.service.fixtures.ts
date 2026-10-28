import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { Cobranza, CobroRegistrado, IngresoVendedor } from '@/core/models/cobranzas'
import { auditar } from '@/fixtures/auditoria'
import { COBRANZAS, DEVOLUCIONES, siguienteNumero } from '@/fixtures/cobranzas'
import { ahoraBolivia, diaCerrado } from '@/fixtures/inventario'
import { esperar, responder } from '@/fixtures/latencia'
import { CLIENTES } from '@/fixtures/maestros'
import { REGIONALES, VENDEDORES } from '@/fixtures/organizacion'
import { exigirNacional, exigirRegionalPropia, limpio, mismoTexto, regionalesLegibles } from '@/fixtures/sesion'
import { crearSaldoInicial, HOY, moverSaldo, NOTAS, SALDOS } from '@/fixtures/ventas'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto, redondear } from '@/shared/format/moneda'
import { FORMAS_PAGO } from './cobranzas.opciones'
import type { ServicioCobranzas } from './cobranzas.service'

const conDia = (c: Omit<Cobranza, 'dia_cerrado'>): Cobranza => ({ ...c, dia_cerrado: diaCerrado(c.regional_id, c.fecha) })
const enPeriodo = (fecha: string, desde: string, hasta: string) => fecha >= desde && fecha <= hasta

// Imita registrar_cobranzas, anular_cobranza, ingresos_vendedores y
// cargar_cartera_inicial (Contrato §5.3) con sus validaciones.
export const cobranzasFixtures: ServicioCobranzas = {
  async deNota(notaId, opciones) {
    return responder(COBRANZAS.filter((c) => c.nota_venta_id === notaId).map(conDia), opciones)
  },

  async delDia(regionalId, fecha, opciones) {
    return responder(COBRANZAS.filter((c) => c.regional_id === regionalId && c.fecha === fecha).map(conDia), opciones)
  },

  async registrar(c) {
    await esperar()
    exigirRegionalPropia(c.regional_id)
    if (c.fecha > HOY) throw new ErrorNegocio('FECHA_INVALIDA', 'La fecha no puede ser posterior a hoy.', { campo: 'fecha' })
    if (diaCerrado(c.regional_id, c.fecha)) throw new ErrorNegocio('DIA_CERRADO', `El día ${formatoFecha(c.fecha)} ya está cerrado.`, { campo: 'fecha' })
    if (!FORMAS_PAGO.some((f) => f.valor === c.forma_pago)) throw new ErrorNegocio('VALIDACION', 'Elija la forma de pago.', { campo: 'forma_pago' })
    if (!c.aplicaciones.length) throw new ErrorNegocio('VALIDACION', 'Marque al menos un documento.')
    // Todo o nada: se valida cada documento antes de registrar.
    for (const a of c.aplicaciones) {
      const doc = SALDOS.find((s) => s.documento_id === a.documento_id && s.regional_id === c.regional_id)
      const nota = NOTAS.find((n) => n.id === a.documento_id)
      if (nota?.estado === 'anulada') throw new ErrorNegocio('NOTA_ANULADA', `La nota ${nota.numero} está anulada.`, { documento_id: a.documento_id })
      if (nota?.condicion_tipo === 'contado') throw new ErrorNegocio('DOCUMENTO_CONTADO', `La nota ${nota.numero} es al contado: no se cobra aparte.`, { documento_id: a.documento_id })
      if (!doc) throw new ErrorNegocio('NO_ENCONTRADO', 'El documento no existe en la regional.', { documento_id: a.documento_id })
      if (!(a.importe > 0) || a.importe > doc.saldo) {
        throw new ErrorNegocio('IMPORTE_EXCEDE_SALDO', `El importe supera el saldo de ${doc.numero} (Bs ${formatoMonto(doc.saldo)}).`, { documento_id: a.documento_id, saldo: doc.saldo })
      }
    }
    const creado = ahoraBolivia()
    const usuario = perfilDemoActual()?.nombre ?? 'Sistema'
    const registrados: CobroRegistrado[] = []
    for (const a of c.aplicaciones) {
      const doc = SALDOS.find((s) => s.documento_id === a.documento_id)
      const nota = NOTAS.find((n) => n.id === a.documento_id)
      const cliente = CLIENTES.find((x) => x.id === doc?.cliente_id)
      const cobro: Omit<Cobranza, 'dia_cerrado'> = {
        id: `cb-${Date.now().toString(36)}-${registrados.length}`,
        numero: siguienteNumero('CB', c.regional_id, COBRANZAS),
        regional_id: c.regional_id,
        fecha: c.fecha,
        tipo_doc: a.tipo_doc,
        nota_venta_id: a.tipo_doc === 'nota' ? a.documento_id : null,
        cxc_saldo_inicial_id: a.tipo_doc === 'saldo_inicial' ? a.documento_id : null,
        documento_numero: doc?.numero ?? '',
        numero_factura: doc?.numero_factura ?? null,
        cliente_id: doc?.cliente_id ?? '',
        cliente_nombre: cliente?.nombre ?? '',
        vendedor_id: nota?.vendedor_id ?? cliente?.vendedor_id ?? null,
        forma_pago: c.forma_pago,
        referencia_pago: limpio(c.referencia_pago),
        importe: redondear(a.importe),
        estado: 'vigente',
        motivo_anulacion: null,
        anulada_en: null,
        observaciones: limpio(c.observaciones),
        usuario_nombre: usuario,
        created_at: creado,
      }
      COBRANZAS.push(cobro)
      auditar({ regional_id: cobro.regional_id, entidad: 'cobranza', entidad_id: cobro.id, registro: cobro.numero, accion: 'registrar_cobranza', datos: { documento: cobro.documento_numero, importe: cobro.importe, forma_pago: cobro.forma_pago } })
      moverSaldo(a.documento_id, { cobrado: cobro.importe })
      registrados.push({ id: cobro.id, numero: cobro.numero, documento_id: a.documento_id, importe: cobro.importe })
    }
    return responder(registrados)
  },

  async anular(id, motivo) {
    await esperar()
    const cobro = COBRANZAS.find((c) => c.id === id)
    if (!cobro) throw new ErrorNegocio('NO_ENCONTRADO', 'El cobro no existe.')
    exigirRegionalPropia(cobro.regional_id)
    if (cobro.estado !== 'vigente') throw new ErrorNegocio('COBRANZA_NO_ANULABLE', 'El cobro ya está anulado.')
    if (diaCerrado(cobro.regional_id, cobro.fecha)) throw new ErrorNegocio('DIA_CERRADO', 'El día del cobro está cerrado: no se puede anular.')
    if (!limpio(motivo)) throw new ErrorNegocio('VALIDACION', 'El motivo es obligatorio.', { campo: 'motivo' })
    Object.assign(cobro, { estado: 'anulada', motivo_anulacion: limpio(motivo), anulada_en: ahoraBolivia() })
    auditar({ regional_id: cobro.regional_id, entidad: 'cobranza', entidad_id: cobro.id, registro: cobro.numero, accion: 'anular_cobranza', datos: { motivo: cobro.motivo_anulacion, importe: cobro.importe } })
    moverSaldo(cobro.nota_venta_id ?? cobro.cxc_saldo_inicial_id ?? '', { cobrado: -cobro.importe })
    return responder({ id: cobro.id, estado: cobro.estado })
  },

  // Reglas §7.2.
  async ingresosVendedores(regionalId, desde, hasta, detalle, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const filas: IngresoVendedor[] = []
    for (const v of VENDEDORES.filter((x) => regionales.includes(x.regional_id)).sort((a, b) => a.nombre.localeCompare(b.nombre))) {
      const notas = NOTAS.filter((n) => n.vendedor_id === v.id && enPeriodo(n.fecha, desde, hasta))
      const emitidas = notas.filter((n) => n.estado === 'emitida')
      const suma = (valores: number[]) => redondear(valores.reduce((t, x) => t + x, 0))
      const ventasContado = suma(emitidas.filter((n) => n.condicion_tipo === 'contado').map((n) => n.total))
      const ventasCredito = suma(emitidas.filter((n) => n.condicion_tipo === 'credito').map((n) => n.total))
      const cobranzas = suma(COBRANZAS.filter((c) => c.estado === 'vigente' && c.vendedor_id === v.id && enPeriodo(c.fecha, desde, hasta)).map((c) => c.importe))
      const reembolsos = suma(
        DEVOLUCIONES.filter((d) => d.tipo_reverso === 'reembolso' && enPeriodo(d.fecha, desde, hasta) && NOTAS.find((n) => n.id === d.nota_venta_id)?.vendedor_id === v.id).map((d) => d.importe),
      )
      if (!v.activo && !notas.length && !cobranzas && !reembolsos) continue
      filas.push({
        vendedor_id: v.id,
        vendedor: v.nombre,
        notas: emitidas.length,
        ventas_contado: ventasContado,
        ventas_credito: ventasCredito,
        cobranzas,
        reembolsos,
        ingreso: redondear(ventasContado + cobranzas - reembolsos),
        ...(detalle && {
          detalle: notas
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero.localeCompare(b.numero))
            .map((n) => ({ id: n.id, numero: n.numero, fecha: n.fecha, cliente: n.cliente_nombre, condicion: n.condicion_nombre, total: n.total, estado: n.estado })),
        }),
      })
    }
    return responder(filas, opciones)
  },

  async cargarCartera(regionalId, documentos) {
    await esperar()
    exigirNacional()
    const vistos = new Set<string>()
    for (const d of documentos) {
      const numero = d.numero_documento.trim()
      if (!CLIENTES.some((c) => c.id === d.cliente_id && c.regional_id === regionalId)) throw new ErrorNegocio('VALIDACION', `El cliente de ${numero} no es de la regional.`)
      if (!(d.importe > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha_documento)) throw new ErrorNegocio('VALIDACION', `Revise la fecha y el importe de ${numero}.`)
      const repetido = vistos.has(numero.toLowerCase()) || SALDOS.some((s) => s.tipo_doc === 'saldo_inicial' && s.regional_id === regionalId && mismoTexto(s.numero, numero))
      if (repetido) throw new ErrorNegocio('DUPLICADO', `El documento ${numero} ya está cargado.`, { numero_documento: numero })
      vistos.add(numero.toLowerCase())
    }
    for (const d of documentos) {
      SALDOS.push(
        crearSaldoInicial({
          id: `si-${Date.now().toString(36)}-${SALDOS.length}`,
          regional_id: regionalId,
          cliente_id: d.cliente_id,
          numero: d.numero_documento.trim(),
          fecha: d.fecha_documento,
          fecha_vencimiento: d.fecha_vencimiento,
          importe: redondear(d.importe),
        }),
      )
    }
    auditar({ regional_id: regionalId, entidad: 'cxc_saldo_inicial', entidad_id: regionalId, registro: REGIONALES.find((r) => r.id === regionalId)?.nombre ?? '', accion: 'cargar_cartera_inicial', datos: { documentos: documentos.length, total: redondear(documentos.reduce((t, d) => t + d.importe, 0)) } })
    return responder({ insertados: documentos.length })
  },
}
