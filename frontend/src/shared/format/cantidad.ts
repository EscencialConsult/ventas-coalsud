const conDecimales = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const entero = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

// Las cantidades admiten fracciones (granel), pero lo normal son unidades enteras:
// se muestran sin decimales salvo que los tengan.
export function formatoCantidad(valor: number): string {
  const v = valor || 0
  return Number.isInteger(v) ? entero.format(v) : conDecimales.format(v)
}
