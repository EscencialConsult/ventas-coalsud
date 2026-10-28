import { redondear } from '@/shared/format/moneda'

/**
 * Reglas de Cálculo §4: con el precio y el descuento de la nota original.
 * En el modal es solo para mostrar; el importe oficial lo devuelve la base.
 */
export function importeDevolucion(items: { cantidad: number; precio: number }[], descuentoPct: number): number {
  const bruto = items.reduce((t, i) => t + i.cantidad * i.precio, 0)
  return redondear(bruto * (1 - descuentoPct / 100))
}
