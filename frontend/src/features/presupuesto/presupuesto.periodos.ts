import { formatoPeriodo, sumarMeses } from '@/shared/format/fecha'

/** Períodos elegibles: los próximos 3 meses y los últimos 6. */
export const periodosAlrededor = (mes: string) => Array.from({ length: 10 }, (_, i) => sumarMeses(mes, 3 - i)).map((p) => ({ valor: p, etiqueta: formatoPeriodo(p) }))
