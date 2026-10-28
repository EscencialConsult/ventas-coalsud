import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ContextoPeriodoDashboard } from './contextoPeriodo'
import type { FiltroPeriodo } from './periodos'

// Filtro de período del dashboard: vive solo en memoria (se borra al recargar
// o al salir), a pedido del usuario, para que nadie quede con un filtro olvidado.
export function PeriodoDashboardProvider({ children }: { children: ReactNode }) {
  const [filtro, setFiltro] = useState<FiltroPeriodo | null>(null)
  const quitar = useCallback(() => setFiltro(null), [])
  const valor = useMemo(() => ({ filtro, aplicar: setFiltro, quitar }), [filtro, quitar])
  return <ContextoPeriodoDashboard.Provider value={valor}>{children}</ContextoPeriodoDashboard.Provider>
}
