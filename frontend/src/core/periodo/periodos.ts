import { diasEntre, formatoFecha, formatoFechaCorta, inicioDeMes, sumarDias, sumarMeses, finDeMes } from '@/shared/format/fecha'

// Filtro de período del dashboard (⚙ DT-23). Sin filtro, el dashboard muestra
// el mes en curso; con filtro, el rango elegido. Solo afecta consultas.

export type PresetPeriodo = 'hoy' | 'ayer' | 'ultimos_7' | 'ultimos_30' | 'mes_anterior' | 'anio' | 'rango'

export interface Rango {
  desde: string
  hasta: string
}

export interface FiltroPeriodo extends Rango {
  preset: PresetPeriodo
}

/** Un año como máximo: la serie diaria del KPI no crece sin límite. */
export const MAX_DIAS_RANGO = 366

export const PRESETS: { preset: Exclude<PresetPeriodo, 'rango'>; etiqueta: string }[] = [
  { preset: 'hoy', etiqueta: 'Hoy' },
  { preset: 'ayer', etiqueta: 'Ayer' },
  { preset: 'ultimos_7', etiqueta: 'Últimos 7 días' },
  { preset: 'ultimos_30', etiqueta: 'Últimos 30 días' },
  { preset: 'mes_anterior', etiqueta: 'Mes anterior' },
  { preset: 'anio', etiqueta: 'Este año' },
]

export function rangoDePreset(preset: Exclude<PresetPeriodo, 'rango'>, hoy: string): Rango {
  switch (preset) {
    case 'hoy':
      return { desde: hoy, hasta: hoy }
    case 'ayer': {
      const ayer = sumarDias(hoy, -1)
      return { desde: ayer, hasta: ayer }
    }
    case 'ultimos_7':
      return { desde: sumarDias(hoy, -6), hasta: hoy }
    case 'ultimos_30':
      return { desde: sumarDias(hoy, -29), hasta: hoy }
    case 'mes_anterior': {
      const desde = `${sumarMeses(hoy.slice(0, 7), -1)}-01`
      return { desde, hasta: finDeMes(desde) }
    }
    case 'anio':
      return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy }
  }
}

/** El mes en curso (lo que muestra el dashboard sin filtro). */
export function rangoMesEnCurso(hoy: string): Rango {
  return { desde: inicioDeMes(hoy), hasta: hoy }
}

export function etiquetaFiltro(filtro: FiltroPeriodo): string {
  return PRESETS.find((p) => p.preset === filtro.preset)?.etiqueta ?? 'Rango personalizado'
}

/** '21/10 – 27/10/2026', o una sola fecha si el rango es de un día. */
export function textoRango({ desde, hasta }: Rango): string {
  if (desde === hasta) return formatoFecha(desde)
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4)
  return `${mismoAnio ? formatoFechaCorta(desde) : formatoFecha(desde)} – ${formatoFecha(hasta)}`
}

export function cantidadDias(rango: Rango): number {
  return diasEntre(rango.desde, rango.hasta)
}
