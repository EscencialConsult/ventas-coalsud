import type { Perfil } from '@/core/models/organizacion'

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function descripcionRol(perfil: Perfil): string {
  if (perfil.rol === 'nacional') return 'Nacional · todas las regionales'
  return `Regional · ${perfil.regionales.map((r) => r.codigo).join(' + ')}`
}
