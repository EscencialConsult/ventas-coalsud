import type { FormatoCelda } from '@/shared/export/excelTabla'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'

/** Valor de una celda de reporte en pantalla e impresión (en Excel va el número). */
export function textoCelda(formato: FormatoCelda, valor: string | number | null): string {
  if (valor === null || valor === '') return '—'
  if (typeof valor === 'string') return formato === 'fecha' ? formatoFecha(valor) : valor
  if (formato === 'monto') return formatoMonto(valor)
  if (formato === 'pct') return `${formatoCantidad(valor)} %`
  return formatoCantidad(valor)
}

/** Parámetros de la impresión: los mismos filtros de la pantalla. */
export function parametrosImpresion(regionalId: string | null, crudos: Record<string, string>, desde: string, hasta: string) {
  return new URLSearchParams({ ...crudos, desde, hasta, ...(regionalId ? { regional: regionalId } : {}) }).toString()
}
