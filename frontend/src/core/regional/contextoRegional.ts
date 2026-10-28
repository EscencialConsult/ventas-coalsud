import { createContext } from 'react'
import type { Regional } from '@/core/models/organizacion'

export interface ValorRegionalActiva {
  /** null = "Todas" (solo el nacional; lectura consolidada). */
  regionalActiva: Regional | null
  regionalActivaId: string | null
  opciones: Regional[]
  /** El nacional puede elegir "Todas". */
  permiteTodas: boolean
  /** Regional con una sola regional: sin selector. */
  fija: boolean
  cambiar(regionalId: string | null): void
}

export const ContextoRegionalActiva = createContext<ValorRegionalActiva | undefined>(undefined)
