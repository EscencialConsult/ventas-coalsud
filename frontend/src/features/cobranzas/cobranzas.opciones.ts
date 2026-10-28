import type { FormaPago } from '@/core/models/cobranzas'

/** ⚠ SUP-42. */
export const FORMAS_PAGO: { valor: FormaPago; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'qr', etiqueta: 'QR' },
  { valor: 'cheque', etiqueta: 'Cheque' },
  { valor: 'deposito', etiqueta: 'Depósito' },
  { valor: 'otro', etiqueta: 'Otro' },
]

export const etiquetaFormaPago = (forma: FormaPago) => FORMAS_PAGO.find((f) => f.valor === forma)?.etiqueta ?? forma
