import { useContext } from 'react'
import { useHoy } from '@/core/fecha/useHoy'
import { ContextoPeriodoDashboard, type ValorPeriodoDashboard } from './contextoPeriodo'
import { rangoMesEnCurso, type Rango } from './periodos'

export function usePeriodoDashboard(): ValorPeriodoDashboard {
  const valor = useContext(ContextoPeriodoDashboard)
  if (!valor) throw new Error('usePeriodoDashboard debe usarse dentro de <PeriodoDashboardProvider>')
  return valor
}

/**
 * Rango que consultan las secciones del dashboard: el del filtro o, sin
 * filtro, el mes en curso. Devuelve strings: sirven directo en las claves de
 * consulta (regla 30).
 */
export function useRangoDashboard(): Rango & { filtrado: boolean } {
  const { filtro } = usePeriodoDashboard()
  const hoy = useHoy()
  const rango = filtro ?? rangoMesEnCurso(hoy)
  return { desde: rango.desde, hasta: rango.hasta, filtrado: filtro !== null }
}
