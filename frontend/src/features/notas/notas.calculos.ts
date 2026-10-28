import { redondear } from '@/shared/format/moneda'

export interface Totales {
  bruto: number
  descuento: number
  total: number
}

/**
 * Reglas de Cálculo §1. En el formulario es solo para mostrar: el total
 * oficial es el que devuelve `emitir_nota_venta`.
 */
export function calcularTotales(items: { cantidad: number; precio: number }[], descuentoPct: number): Totales {
  const bruto = redondear(items.reduce((t, i) => t + redondear(i.cantidad * i.precio), 0))
  const total = redondear(bruto * (1 - descuentoPct / 100))
  return { bruto, descuento: redondear(bruto - total), total }
}

/** "12.5" o "12,5" → 12.5 (hasta 2 decimales); vacío o inválido → null. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : null
}
