// ⚠ SUP-39: formato de las planillas del cliente (coma de miles, punto decimal).
const formato = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatoSinDecimales = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatoMonto(valor: number): string {
  // `|| 0` evita mostrar "-0.00" cuando la base devuelve -0.
  return formato.format(valor || 0)
}

/** Monto redondeado a bolivianos enteros: solo para resúmenes (KPIs), nunca en documentos. */
export function formatoMontoEntero(valor: number): string {
  return formatoSinDecimales.format(Math.round(valor) || 0)
}

export function formatoBs(valor: number): string {
  return `Bs ${formatoMonto(valor)}`
}

export function formatoPct(valor: number | null | undefined, decimales = 0): string {
  if (valor == null) return '—'
  return `${valor.toFixed(decimales)} %`
}

/** Redondeo a centavos como la base (`round(x, 2)`), sin el error de coma flotante de 1.005. */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}
