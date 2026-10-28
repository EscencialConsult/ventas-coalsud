import { createContext } from 'react'
import type { FiltroPeriodo } from './periodos'

export interface ValorPeriodoDashboard {
  /** null = sin filtro (mes en curso). */
  filtro: FiltroPeriodo | null
  aplicar(filtro: FiltroPeriodo): void
  quitar(): void
}

export const ContextoPeriodoDashboard = createContext<ValorPeriodoDashboard | undefined>(undefined)
