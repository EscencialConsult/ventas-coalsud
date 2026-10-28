// Las fechas de negocio viajan como 'YYYY-MM-DD' y se formatean sin pasar por
// Date: así no se corren un día por la zona horaria del navegador (RNF-29).

export const ZONA_BOLIVIA = 'America/La_Paz'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

const formatoInstante = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_BOLIVIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Instante (timestamptz) en hora de Bolivia: "11/06/2026 14:32". */
export function formatoFechaHora(instante: string | null | undefined): string {
  if (!instante) return '—'
  const partes = Object.fromEntries(formatoInstante.formatToParts(new Date(instante)).map((p) => [p.type, p.value]))
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`
}

/**
 * Fecha de hoy en Bolivia según el reloj del equipo. En modo supabase la
 * fuente es rpc('hoy'); esto solo lo usan los fixtures y los valores iniciales.
 */
export function hoyBolivia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_BOLIVIA }).format(ahora)
}

export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d + dias))
  return fecha.toISOString().slice(0, 10)
}

export function inicioDeMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? ''
}

/** '2026-10' → 'Octubre 2026' */
export function formatoPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number)
  return `${nombreMes(mes)} ${anio}`
}

/** '2026-10-21' → '21/10' */
export function formatoFechaCorta(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

/** '2026-10-21' → '21 de octubre de 2026' (nombres accesibles del calendario). */
export function formatoFechaLarga(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return `${dia} de ${nombreMes(mes).toLowerCase()} de ${anio}`
}

function aUtc(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

/** Día de la semana con el lunes primero: 0 = lunes … 6 = domingo. */
export function diaSemana(iso: string): number {
  return (aUtc(iso).getUTCDay() + 6) % 7
}

export function diasEnMes(periodo: string): number {
  const [anio, mes] = periodo.split('-').map(Number)
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

/** Días entre dos fechas, contando ambas: (21/10, 27/10) → 7. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUtc(hasta).getTime() - aUtc(desde).getTime()) / 86_400_000) + 1
}

/** Suma meses a un período 'YYYY-MM' ('2026-01', -1) → '2025-12'. */
export function sumarMeses(periodo: string, meses: number): string {
  const [anio, mes] = periodo.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1 + meses, 1))
  return fecha.toISOString().slice(0, 7)
}

export function finDeMes(iso: string): string {
  const periodo = iso.slice(0, 7)
  return `${periodo}-${String(diasEnMes(periodo)).padStart(2, '0')}`
}
