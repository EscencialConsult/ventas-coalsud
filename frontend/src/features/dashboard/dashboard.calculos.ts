import type { CumplimientoPresupuesto } from '@/core/models/dashboard'

/**
 * % de cumplimiento general = Σ real / Σ meta de las metas por regional
 * (sin las de vendedor ni las de categoría, que ya están dentro de la regional).
 * Reglas de Cálculo §10. Se deriva de filas ya cargadas (regla 32).
 */
export function cumplimientoGeneral(filas: CumplimientoPresupuesto[]): number | null {
  const regionales = filas.filter((f) => f.vendedor === null && f.categoria === null)
  const meta = regionales.reduce((s, f) => s + f.meta, 0)
  if (!meta) return null
  return (regionales.reduce((s, f) => s + f.real, 0) / meta) * 100
}

/**
 * Proyección de cierre general = Σ proyección / Σ meta de las metas por
 * regional que tienen proyección (Reglas de Cálculo §8, ⚠ SUP-33). Derivada
 * de las mismas filas: no se pide aparte (regla 32).
 */
export function proyeccionGeneral(filas: CumplimientoPresupuesto[]): number | null {
  const regionales = filas.filter((f) => f.vendedor === null && f.categoria === null && f.proyeccion !== null)
  const meta = regionales.reduce((s, f) => s + f.meta, 0)
  if (!meta) return null
  return (regionales.reduce((s, f) => s + (f.proyeccion ?? 0), 0) / meta) * 100
}
