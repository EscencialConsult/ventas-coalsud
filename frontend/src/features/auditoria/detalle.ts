import type { AccionAuditoria } from '@/core/models/auditoria'
import type { FormaPago, TipoReverso } from '@/core/models/cobranzas'
import type { TipoDocumento } from '@/core/models/inventario'
import { etiquetaFormaPago } from '@/features/cobranzas/cobranzas.opciones'
import { TIPOS_REVERSO } from '@/features/devoluciones/devoluciones.opciones'
import { TIPOS_DOCUMENTO } from '@/features/inventario/inventario.tipos'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'

// "Ver detalle" de la auditoría (06-pantallas/12): los datos guardados por la
// base, legibles para un usuario (nombres en castellano, Bs, fechas).

const ETIQUETAS: Record<string, string> = {
  cliente: 'Cliente',
  total: 'Total',
  condicion: 'Condición',
  numero_factura: 'N° de factura',
  pdf: 'PDF de la factura',
  motivo: 'Motivo',
  factura: 'Factura',
  documento: 'Documento',
  importe: 'Importe',
  forma_pago: 'Forma de pago',
  nota: 'Nota',
  tipo_reverso: 'Tipo de devolución',
  tipo: 'Tipo de documento',
  items: 'Productos',
  total_ventas: 'Total ventas',
  insertados: 'Documentos cargados',
  documentos: 'Documentos cargados',
  descuento_pct: 'Descuento',
  descuento_bs: 'Descuento en Bs',
  producto: 'Producto',
  numero: 'N°',
  fecha: 'Fecha',
  nc_contable_numero: 'N° de nota de crédito',
  total_contado_bruto: 'Contado bruto',
  total_credito_bruto: 'Crédito bruto',
  descuento_contado: 'Descuento contado',
  descuento_credito: 'Descuento crédito',
  total_cobranzas: 'Cobranzas',
  total_reembolsos: 'Reembolsos',
  total_efectivo: 'Total efectivo',
}

const MONTOS = new Set([
  'total', 'importe', 'total_ventas', 'descuento_bs', 'bruto', 'precio_base',
  'total_contado_bruto', 'total_credito_bruto', 'descuento_contado', 'descuento_credito', 'total_cobranzas', 'total_reembolsos', 'total_efectivo',
])

/** Cuando "antes" y "después" son un solo valor (no un objeto), qué campo es. */
const VALOR_DE: Partial<Record<AccionAuditoria, string>> = { cambio_precio: 'Precio unitario' }

const etiqueta = (clave: string) => ETIQUETAS[clave] ?? clave.charAt(0).toUpperCase() + clave.slice(1).replace(/_/g, ' ')

function texto(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (Array.isArray(valor)) return clave === 'items' ? `${valor.length} productos` : String(valor.length)
  if (clave === 'pdf') return 'Adjuntado'
  if (clave === 'forma_pago') return etiquetaFormaPago(valor as FormaPago)
  if (clave === 'tipo_reverso') return TIPOS_REVERSO[valor as TipoReverso]?.etiqueta ?? String(valor)
  if (clave === 'tipo') return TIPOS_DOCUMENTO[valor as TipoDocumento]?.etiqueta ?? String(valor)
  if (typeof valor === 'number') {
    if (clave === 'descuento_pct') return `${formatoCantidad(valor)} %`
    return MONTOS.has(clave) || clave === 'precio' ? `Bs ${formatoMonto(valor)}` : formatoCantidad(valor)
  }
  if (typeof valor === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? formatoFecha(valor) : valor
  return JSON.stringify(valor)
}

export interface FilaCambio {
  campo: string
  antes: string
  despues: string
  cambio: boolean
}

export interface DetalleLegible {
  /** Campo | Antes | Después (si la acción guarda un antes/después). */
  cambios: FilaCambio[]
  /** El resto de los datos, como "Campo: valor". */
  datos: { campo: string; valor: string }[]
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function detalleLegible(accion: AccionAuditoria, datos: Record<string, unknown>): DetalleLegible {
  const { antes, despues, ...resto } = datos
  const cambios: FilaCambio[] = []
  if (esObjeto(antes) || esObjeto(despues)) {
    const a = esObjeto(antes) ? antes : {}
    const d = esObjeto(despues) ? despues : {}
    for (const clave of [...new Set([...Object.keys(a), ...Object.keys(d)])]) {
      const textoAntes = texto(clave, a[clave])
      const textoDespues = texto(clave, d[clave])
      cambios.push({ campo: etiqueta(clave), antes: textoAntes, despues: textoDespues, cambio: textoAntes !== textoDespues })
    }
  } else if (antes !== undefined || despues !== undefined) {
    // Un solo valor que cambió (p. ej. el precio de un ítem).
    const clave = accion === 'cambio_precio' ? 'precio' : 'valor'
    const textoAntes = texto(clave, antes)
    const textoDespues = texto(clave, despues)
    cambios.push({ campo: VALOR_DE[accion] ?? 'Valor', antes: textoAntes, despues: textoDespues, cambio: textoAntes !== textoDespues })
  }
  // Un objeto anidado (p. ej. los totales del cierre) se muestra campo por campo.
  const planos = Object.entries(resto).flatMap(([clave, valor]) => (esObjeto(valor) ? Object.entries(valor) : [[clave, valor] as const]))
  return { cambios, datos: planos.map(([clave, valor]) => ({ campo: etiqueta(clave), valor: texto(clave, valor) })) }
}
