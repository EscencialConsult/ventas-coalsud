import { useQuery } from '@tanstack/react-query'
import { useHoy } from '@/core/fecha/useHoy'
import { usePeriodoDashboard, useRangoDashboard } from '@/core/periodo/usePeriodoDashboard'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { dashboardService } from './dashboard.service'

// Las claves dependen de ids y strings (regla 30). Al cambiar la regional,
// la clave cambia: no se muestran datos del filtro anterior (regla 31) y la
// petición vieja se cancela por su signal (regla 19).
export const clavesDashboard = {
  todo: ['dashboard'] as const,
  kpis: (regionalId: string | null, desde: string | null, hasta: string | null) => ['dashboard', 'kpis', regionalId, desde, hasta] as const,
  ventasRegional: (desde: string, hasta: string) => ['dashboard', 'ventas-regional', desde, hasta] as const,
  cumplimiento: (periodo: string, regionalId: string | null) => ['dashboard', 'cumplimiento', periodo, regionalId] as const,
  ultimasNotas: (regionalId: string | null, desde: string | null, hasta: string | null) => ['dashboard', 'ultimas-notas', regionalId, desde, hasta] as const,
}

// Filtro de período (⚙ DT-23): desde/hasta en la clave como strings; sin
// filtro van en null (mes en curso, lo decide la base).
function useFiltroComoClave() {
  const { filtro } = usePeriodoDashboard()
  return { desde: filtro?.desde ?? null, hasta: filtro?.hasta ?? null }
}

export function useKpis() {
  const { regionalActivaId } = useRegionalActiva()
  const { desde, hasta } = useFiltroComoClave()
  return useQuery({
    queryKey: clavesDashboard.kpis(regionalActivaId, desde, hasta),
    queryFn: ({ signal }) => dashboardService.kpis(regionalActivaId, desde && hasta ? { desde, hasta } : null, { signal }),
  })
}

export function useVentasPorRegional() {
  const { desde, hasta } = useRangoDashboard()
  return useQuery({
    queryKey: clavesDashboard.ventasRegional(desde, hasta),
    queryFn: ({ signal }) => dashboardService.ventasPorRegional(desde, hasta, { signal }),
  })
}

export function useCumplimiento() {
  const { regionalActivaId } = useRegionalActiva()
  const periodo = useHoy().slice(0, 7)
  return useQuery({
    queryKey: clavesDashboard.cumplimiento(periodo, regionalActivaId),
    queryFn: ({ signal }) => dashboardService.cumplimiento(periodo, regionalActivaId, { signal }),
  })
}

export function useUltimasNotas() {
  const { regionalActivaId } = useRegionalActiva()
  const { desde, hasta } = useFiltroComoClave()
  return useQuery({
    queryKey: clavesDashboard.ultimasNotas(regionalActivaId, desde, hasta),
    queryFn: ({ signal }) => dashboardService.ultimasNotas(regionalActivaId, 8, desde && hasta ? { desde, hasta } : null, { signal }),
  })
}
