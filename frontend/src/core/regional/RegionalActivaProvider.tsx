import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Perfil } from '@/core/models/organizacion'
import { useSesion } from '@/core/auth/useSesion'
import { ContextoRegionalActiva, type ValorRegionalActiva } from './contextoRegional'

const clave = (usuarioId: string) => `coalsud.regional.${usuarioId}`

function leerGuardada(usuarioId: string): string | null | undefined {
  try {
    const valor = localStorage.getItem(clave(usuarioId))
    if (valor === null) return undefined
    return valor === 'todas' ? null : valor
  } catch {
    return undefined
  }
}

function inicial(perfil: Perfil | null): string | null {
  if (!perfil) return null
  const guardada = leerGuardada(perfil.id)
  const valida = (id: string | null | undefined) =>
    id === null ? perfil.rol === 'nacional' : !!id && perfil.regionales.some((r) => r.id === id)
  if (guardada !== undefined && valida(guardada)) return guardada
  // Nacional: "Todas"; regional: la primera de las suyas.
  return perfil.rol === 'nacional' ? null : (perfil.regionales[0]?.id ?? null)
}

// Regional activa (Arquitectura FE §3). Todas las query keys la incluyen: al
// cambiarla, las pantallas se refrescan sin lógica extra.
export function RegionalActivaProvider({ children }: { children: ReactNode }) {
  const { perfil } = useSesion()
  // Se guarda junto con el usuario dueño de la elección: si cambia la sesión,
  // se recalcula sin un efecto que sincronice estados.
  const [eleccion, setEleccion] = useState<{ usuarioId: string | null; regionalId: string | null }>(() => ({
    usuarioId: perfil?.id ?? null,
    regionalId: inicial(perfil),
  }))

  const regionalActivaId = eleccion.usuarioId === (perfil?.id ?? null) ? eleccion.regionalId : inicial(perfil)

  const cambiar = useCallback(
    (regionalId: string | null) => {
      if (!perfil) return
      setEleccion({ usuarioId: perfil.id, regionalId })
      try {
        localStorage.setItem(clave(perfil.id), regionalId ?? 'todas')
      } catch {
        // Sin storage: la elección dura lo que la pestaña.
      }
    },
    [perfil],
  )

  const valor = useMemo<ValorRegionalActiva>(() => {
    const opciones = perfil?.regionales ?? []
    return {
      regionalActiva: opciones.find((r) => r.id === regionalActivaId) ?? null,
      regionalActivaId,
      opciones,
      permiteTodas: perfil?.rol === 'nacional',
      fija: perfil?.rol === 'regional' && opciones.length <= 1,
      cambiar,
    }
  }, [perfil, regionalActivaId, cambiar])

  return <ContextoRegionalActiva.Provider value={valor}>{children}</ContextoRegionalActiva.Provider>
}
