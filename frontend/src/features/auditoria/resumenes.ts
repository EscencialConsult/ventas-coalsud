import type { AccionAuditoria, EntidadAuditoria, RegistroAuditoria } from '@/core/models/auditoria'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'

export const ACCIONES: Record<AccionAuditoria, string> = {
  emitir_nota: 'Emitir nota',
  cambio_precio: 'Cambio de precio',
  descuento: 'Descuento',
  anular_nota: 'Anular nota',
  registrar_factura: 'Registrar factura',
  registrar_cobranza: 'Registrar cobro',
  anular_cobranza: 'Anular cobro',
  registrar_devolucion: 'Devolución',
  registrar_documento: 'Documento de inventario',
  cerrar_dia: 'Cerrar día',
  reabrir_dia: 'Reabrir día',
  cargar_cartera: 'Cargar cartera inicial',
}

export const ENTIDADES: Record<EntidadAuditoria, string> = {
  nota_venta: 'Nota de venta',
  cobranza: 'Cobranza',
  devolucion: 'Devolución',
  documento_inventario: 'Documento de inventario',
  liquidacion: 'Liquidación',
  cxc_saldo_inicial: 'Cartera inicial',
}

const texto = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
const bs = (v: unknown) => (typeof v === 'number' ? `Bs ${formatoMonto(v)}` : texto(v))
const de = (datos: Record<string, unknown>, clave: string) => (datos.despues as Record<string, unknown> | undefined)?.[clave]

/** Resumen legible de cada acción a partir de `datos` (06-pantallas/12). */
export function resumen(r: RegistroAuditoria): string {
  const d = r.datos
  switch (r.accion) {
    case 'emitir_nota':
      return `${texto(de(d, 'cliente'))} · ${bs(de(d, 'total'))}`
    case 'cambio_precio':
      return `${texto(d.producto)}: ${formatoMonto(Number(d.antes))} → ${formatoMonto(Number(d.despues))}`
    case 'descuento':
      return `Descuento ${texto(d.descuento_pct)} %`
    case 'anular_nota':
    case 'anular_cobranza':
    case 'reabrir_dia':
      return `Motivo: ${texto(d.motivo)}`
    case 'registrar_factura':
      return `Factura ${texto(de(d, 'numero_factura'))}`
    case 'registrar_cobranza':
      return `${bs(d.importe)} · ${texto(d.documento)}`
    case 'registrar_devolucion':
      return `${d.tipo_reverso === 'abono_cuenta' ? 'Abono a cuenta' : 'Reembolso'} · ${bs(d.importe)}`
    case 'registrar_documento':
      return `${texto(d.tipo)} · ${texto(d.items)} productos`
    case 'cerrar_dia':
      return `Total ventas ${bs(d.total_ventas)}`
    case 'cargar_cartera':
      return `${texto(d.insertados)} documentos`
  }
}

/** Enlace del registro, si la entidad tiene pantalla. */
export function enlace(r: RegistroAuditoria): string | null {
  if (r.entidad === 'nota_venta') return `/notas/${r.entidad_id}`
  if (r.entidad === 'documento_inventario') return `/inventario/documentos/${r.entidad_id}`
  if (r.entidad === 'devolucion') return '/devoluciones'
  if (r.entidad === 'liquidacion' && r.regional_id) return `/liquidacion/${r.registro}?regional=${r.regional_id}`
  return null
}

export const textoRegistro = (r: RegistroAuditoria) => (r.entidad === 'liquidacion' ? formatoFecha(r.registro) : r.registro)
