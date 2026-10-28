import type { Cobranza, Devolucion, FormaPago } from '@/core/models/cobranzas'
import { sumarDias } from '@/shared/format/fecha'
import { CLIENTES, estable } from './maestros'
import { REGIONALES, usuarioDe } from './organizacion'
import { HOY, NOTAS, SALDOS } from './ventas'

// Cobranzas y devoluciones de ejemplo. Las cobranzas reproducen lo ya cobrado
// en NOTAS y SALDOS (así los saldos cuadran); las devoluciones empiezan vacías.

export const COBRANZAS: Omit<Cobranza, 'dia_cerrado'>[] = []
export const DEVOLUCIONES: Devolucion[] = []
/** devolucion_item: lo devuelto por devolución. */
export const ITEMS_DEVOLUCION = new Map<string, { producto_id: string; cantidad: number; precio_aplicado: number }[]>()

const FORMAS: FormaPago[] = ['efectivo', 'transferencia', 'qr', 'cheque', 'deposito']

/** Siguiente número de la regional: CB-LP-0001, DEV-LP-0001. */
export function siguienteNumero(prefijo: 'CB' | 'DEV', regionalId: string, existentes: { regional_id: string }[]): string {
  const codigo = REGIONALES.find((r) => r.id === regionalId)?.codigo ?? '?'
  const n = existentes.filter((x) => x.regional_id === regionalId).length + 1
  return `${prefijo}-${codigo}-${String(n).padStart(4, '0')}`
}

function generar() {
  const cobros = [
    ...NOTAS.filter((n) => n.cobrado > 0).map((n) => ({
      tipo_doc: 'nota' as const,
      documento_id: n.id,
      regional_id: n.regional_id,
      cliente_id: n.cliente_id,
      numero: n.numero,
      numero_factura: n.numero_factura,
      importe: n.cobrado,
      // Lo de hoy se cobró hoy; lo anterior, dos días después de la nota.
      fecha: n.fecha === HOY ? HOY : sumarDias(n.fecha, 2),
    })),
    ...SALDOS.filter((s) => s.tipo_doc === 'saldo_inicial' && s.cobrado > 0).map((s) => ({
      tipo_doc: 'saldo_inicial' as const,
      documento_id: s.documento_id,
      regional_id: s.regional_id,
      cliente_id: s.cliente_id,
      numero: s.numero,
      numero_factura: null,
      importe: s.cobrado,
      fecha: sumarDias(HOY, -10),
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  for (const c of cobros) {
    const cliente = CLIENTES.find((x) => x.id === c.cliente_id)
    const nota = NOTAS.find((n) => n.id === c.documento_id)
    COBRANZAS.push({
      id: `cb-${c.documento_id}`,
      numero: siguienteNumero('CB', c.regional_id, COBRANZAS),
      regional_id: c.regional_id,
      fecha: c.fecha,
      tipo_doc: c.tipo_doc,
      nota_venta_id: c.tipo_doc === 'nota' ? c.documento_id : null,
      cxc_saldo_inicial_id: c.tipo_doc === 'saldo_inicial' ? c.documento_id : null,
      documento_numero: c.numero,
      numero_factura: c.numero_factura,
      cliente_id: c.cliente_id,
      cliente_nombre: cliente?.nombre ?? '',
      // Las de cartera inicial se atribuyen al vendedor del cliente (Reglas §7.2).
      vendedor_id: nota?.vendedor_id ?? cliente?.vendedor_id ?? null,
      forma_pago: FORMAS[Math.floor(estable(`fp-${c.documento_id}`) * FORMAS.length)],
      referencia_pago: null,
      importe: c.importe,
      estado: 'vigente',
      motivo_anulacion: null,
      anulada_en: null,
      observaciones: null,
      usuario_nombre: usuarioDe(c.regional_id),
      created_at: `${c.fecha}T11:30:00-04:00`,
    })
  }
}

generar()
