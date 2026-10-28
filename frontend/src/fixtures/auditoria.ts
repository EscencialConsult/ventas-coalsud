import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import type { RegistroAuditoria } from '@/core/models/auditoria'
import { sumarDias } from '@/shared/format/fecha'
import { COBRANZAS } from './cobranzas'
import { DOCUMENTOS } from './inventario'
import { REGIONALES, usuarioDe } from './organizacion'
import { HOY, ITEMS_NOTA, LIQUIDACIONES_ABIERTAS, NOTAS } from './ventas'

export const AUDITORIA: RegistroAuditoria[] = []

type Evento = Omit<RegistroAuditoria, 'id' | 'created_at' | 'usuario_nombre' | 'regional_codigo'> & { created_at?: string; usuario_nombre?: string }

/** Lo que en la base escribe cada RPC en `auditoria` (Contrato §5). */
export function auditar(e: Evento): void {
  AUDITORIA.push({
    ...e,
    id: `aud-${AUDITORIA.length + 1}`,
    created_at: e.created_at ?? `${new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 19)}-04:00`,
    usuario_nombre: e.usuario_nombre ?? perfilDemoActual()?.nombre ?? 'Sistema',
    regional_codigo: REGIONALES.find((r) => r.id === e.regional_id)?.codigo ?? null,
  })
}

// Historial de ejemplo: lo que ya pasó en los fixtures.
function generar() {
  for (const n of NOTAS) {
    const base = { regional_id: n.regional_id, entidad: 'nota_venta' as const, entidad_id: n.id, registro: n.numero, usuario_nombre: usuarioDe(n.regional_id) }
    auditar({ ...base, accion: 'emitir_nota', created_at: n.created_at, datos: { despues: { cliente: n.cliente_nombre, total: n.total, condicion: n.condicion_nombre } } })
    for (const i of ITEMS_NOTA.get(n.id) ?? []) {
      if (i.precio_aplicado !== i.precio_base) auditar({ ...base, accion: 'cambio_precio', created_at: n.created_at, datos: { producto: i.producto_nombre, antes: i.precio_base, despues: i.precio_aplicado } })
    }
    if (n.numero_factura) auditar({ ...base, accion: 'registrar_factura', created_at: n.created_at, datos: { antes: { numero_factura: null }, despues: { numero_factura: n.numero_factura } } })
    if (n.estado === 'anulada') auditar({ ...base, accion: 'anular_nota', created_at: n.anulada_en ?? n.created_at, datos: { motivo: n.motivo_anulacion } })
  }
  for (const c of COBRANZAS) {
    auditar({ regional_id: c.regional_id, entidad: 'cobranza', entidad_id: c.id, registro: c.numero, accion: 'registrar_cobranza', created_at: c.created_at, usuario_nombre: c.usuario_nombre, datos: { documento: c.documento_numero, importe: c.importe, forma_pago: c.forma_pago } })
  }
  for (const d of DOCUMENTOS) {
    auditar({ regional_id: d.regional_id, entidad: 'documento_inventario', entidad_id: d.id, registro: d.numero, accion: `registrar_${d.tipo}` as const, created_at: d.created_at, usuario_nombre: d.usuario_nombre, datos: { numero: d.numero, fecha: d.fecha, items: d.items } })
  }
  // Cierres de la última semana con movimiento.
  for (const r of REGIONALES) {
    for (let i = 7; i >= 1; i--) {
      const fecha = sumarDias(HOY, -i)
      const total = NOTAS.filter((n) => n.regional_id === r.id && n.fecha === fecha && n.estado === 'emitida').reduce((t, n) => t + n.total, 0)
      if (LIQUIDACIONES_ABIERTAS.some((l) => l.regional_id === r.id && l.fecha === fecha)) continue
      auditar({ regional_id: r.id, entidad: 'liquidacion', entidad_id: `${r.id}|${fecha}`, registro: fecha, accion: 'cerrar_dia', created_at: `${fecha}T20:30:00-04:00`, usuario_nombre: usuarioDe(r.id), datos: { fecha, totales: { total_ventas: total } } })
    }
  }
}

generar()
