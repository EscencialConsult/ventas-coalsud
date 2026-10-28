import { describe, expect, it } from 'vitest'
import type { CumplimientoPresupuesto } from '@/core/models/dashboard'
import { cumplimientoGeneral, proyeccionGeneral } from './dashboard.calculos'

const fila = (meta: number, real: number, vendedor: string | null = null): CumplimientoPresupuesto => ({
  presupuesto_id: `${meta}-${vendedor}`, periodo: '2026-10', regional: 'La Paz', vendedor, categoria: null,
  meta, real, cumplimiento_pct: (real / meta) * 100, proyeccion: null, estado: 'en_camino',
})

describe('cumplimientoGeneral', () => {
  it('suma solo las metas por regional', () => {
    expect(cumplimientoGeneral([fila(100, 80), fila(100, 40), fila(50, 50, 'Flavia')])).toBe(60)
  })
  it('sin metas no hay porcentaje', () => {
    expect(cumplimientoGeneral([])).toBeNull()
  })
})

describe('proyeccionGeneral', () => {
  const conProyeccion = (meta: number, proyeccion: number | null, vendedor: string | null = null) => ({ ...fila(meta, 0, vendedor), proyeccion })
  it('suma las proyecciones de las metas por regional', () => {
    expect(proyeccionGeneral([conProyeccion(100, 120), conProyeccion(100, 80), conProyeccion(50, 10, 'Flavia')])).toBe(100)
  })
  it('ignora las filas sin proyección; sin ninguna no hay porcentaje', () => {
    expect(proyeccionGeneral([conProyeccion(100, 90), conProyeccion(100, null)])).toBe(90)
    expect(proyeccionGeneral([conProyeccion(100, null)])).toBeNull()
  })
})
