import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'

// Lo que en Supabase decide la RLS, imitado para los servicios fixture (⚙ DT-17).

/** Regionales que el usuario puede leer: la elegida o, con "Todas" (null), todas las suyas. */
export function regionalesLegibles(regionalId: string | null): string[] {
  if (regionalId) return [regionalId]
  return (perfilDemoActual()?.regionales ?? []).map((r) => r.id)
}

export function exigirNacional(): void {
  if (perfilDemoActual()?.rol !== 'nacional') throw new ErrorNegocio('SOLO_NACIONAL', 'Solo un usuario nacional puede hacer esta acción.')
}

/** Escritura transaccional: rol regional sobre una regional propia (RLS patrón B). */
export function exigirRegionalPropia(regionalId: string): void {
  const perfil = perfilDemoActual()
  if (!perfil || perfil.rol !== 'regional' || !perfil.regionales.some((r) => r.id === regionalId)) {
    throw new ErrorNegocio('NO_AUTORIZADO', 'No tiene permiso para esta acción.')
  }
}

/** Texto recortado; vacío → null (Esquema BD §0). */
export function limpio(texto: string | null | undefined): string | null {
  const t = texto?.trim()
  return t ? t : null
}

export function mismoTexto(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
