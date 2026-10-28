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
  cargar_cartera_inicial: 'Cargar cartera inicial',
  registrar_devolucion: 'Devolución',
  registrar_nc_contable: 'Nota de crédito contable',
  registrar_ingreso: 'Ingreso de inventario',
  registrar_salida: 'Salida a vendedor',
  registrar_retorno: 'Retorno de vendedor',
  registrar_traspaso: 'Traspaso',
  registrar_ajuste: 'Ajuste de inventario',
  cerrar_dia: 'Cerrar día',
  reabrir_dia: 'Reabrir día',
  crear: 'Alta',
  editar: 'Edición',
  desactivar: 'Desactivar',
  reactivar: 'Reactivar',
  cambio_precio_base: 'Cambio de precio de lista',
  crear_usuario: 'Alta de usuario',
  editar_usuario: 'Edición de usuario',
  desactivar_usuario: 'Desactivar usuario',
  reactivar_usuario: 'Reactivar usuario',
  resetear_password: 'Resetear contraseña',
}

export const ENTIDADES: Record<EntidadAuditoria, string> = {
  nota_venta: 'Nota de venta',
  cobranza: 'Cobranza',
  devolucion: 'Devolución',
  documento_inventario: 'Documento de inventario',
  liquidacion: 'Liquidación',
  cxc_saldo_inicial: 'Cartera inicial',
  usuario: 'Usuario',
  cliente: 'Cliente',
  vendedor: 'Vendedor',
  producto: 'Producto',
  linea_comercial: 'Línea comercial',
  condicion_pago: 'Condición de pago',
  regional: 'Regional',
  almacen: 'Almacén',
  presupuesto: 'Presupuesto',
}

const texto = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
const bs = (v: unknown) => (typeof v === 'number' ? `Bs ${formatoMonto(v)}` : texto(v))
const objeto = (v: unknown) => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const de = (datos: Record<string, unknown>, clave: string) => objeto(datos.despues)[clave]
const cantidad = (v: unknown) => (Array.isArray(v) ? v.length : texto(v))

/** Resumen legible de cada acción a partir de `datos`, con las claves que escribe la base (06-pantallas/12). */
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
    case 'cargar_cartera_inicial':
      return `${texto(d.documentos)} documentos · ${bs(d.total)}`
    case 'registrar_devolucion':
      return `${d.tipo_reverso === 'abono_cuenta' ? 'Abono a cuenta' : 'Reembolso'} · ${bs(d.importe)}`
    case 'registrar_nc_contable':
      return `NC ${texto(de(d, 'nc_contable_numero'))}`
    case 'registrar_ingreso':
    case 'registrar_salida':
    case 'registrar_retorno':
    case 'registrar_traspaso':
      return `${cantidad(d.items)} productos`
    case 'registrar_ajuste':
      return `${texto(d.motivo)} · ${cantidad(d.items)} productos`
    case 'cerrar_dia':
      return `Total ventas ${bs(objeto(d.totales).total_ventas)}`
    case 'crear':
    case 'crear_usuario':
      return texto(de(d, 'nombre') ?? de(d, 'periodo'))
    case 'editar':
    case 'editar_usuario':
      return `Cambió: ${Object.keys(objeto(d.despues)).join(', ').replace(/_/g, ' ') || '—'}`
    case 'cambio_precio_base':
      return `${bs(objeto(d.antes).precio_base)} → ${bs(de(d, 'precio_base'))}`
    case 'desactivar':
    case 'reactivar':
    case 'desactivar_usuario':
    case 'reactivar_usuario':
    case 'resetear_password':
      return ACCIONES[r.accion]
  }
}

/** Enlace del registro, si la entidad tiene pantalla. */
export function enlace(r: RegistroAuditoria): string | null {
  if (r.entidad === 'nota_venta') return `/notas/${r.entidad_id}`
  if (r.entidad === 'documento_inventario') return `/inventario/documentos/${r.entidad_id}`
  if (r.entidad === 'devolucion') return '/devoluciones'
  if (r.entidad === 'liquidacion' && r.regional_id && r.registro) return `/liquidacion/${r.registro}?regional=${r.regional_id}`
  if (r.entidad === 'cliente') return `/clientes/${r.entidad_id}`
  if (r.entidad === 'usuario') return '/usuarios'
  if (r.entidad === 'presupuesto') return '/presupuesto'
  return null
}

export const textoRegistro = (r: RegistroAuditoria) => (r.entidad === 'liquidacion' && r.registro ? formatoFecha(r.registro) : texto(r.registro))
