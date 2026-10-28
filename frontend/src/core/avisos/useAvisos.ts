import { useQuery } from '@tanstack/react-query'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { avisosService } from './avisos.service'

export const clavesAvisos = {
  todos: ['avisos'] as const,
  deRegional: (regionalId: string | null) => ['avisos', regionalId] as const,
}

// Una sola consulta compartida por sidebar, campana, banner y dashboard.
export function useAvisos() {
  const { regionalActivaId } = useRegionalActiva()
  return useQuery({
    queryKey: clavesAvisos.deRegional(regionalActivaId),
    queryFn: ({ signal }) => avisosService.obtener(regionalActivaId, { signal }),
    staleTime: 60_000,
  })
}
