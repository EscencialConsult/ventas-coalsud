import { useCallback } from 'react'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { puede, type Accion } from './permisos'
import { useSesion } from './useSesion'

export function usePermisos(): (accion: Accion) => boolean {
  const { perfil } = useSesion()
  const { regionalActivaId } = useRegionalActiva()
  return useCallback((accion: Accion) => puede(accion, perfil, regionalActivaId), [perfil, regionalActivaId])
}
