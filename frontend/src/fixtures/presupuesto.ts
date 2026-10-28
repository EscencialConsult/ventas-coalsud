import type { CumplimientoPresupuesto, EstadoPresupuesto } from '@/core/models/dashboard'
import type { CategoriaCliente } from '@/core/models/maestros'
import { diasEnMes, finDeMes, sumarMeses } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { DEVOLUCIONES } from './cobranzas'
import { CLIENTES } from './maestros'
import { REGIONALES, VENDEDORES } from './organizacion'
import { HOY, INDICADORES_REGIONAL, METAS_VENDEDOR, NOTAS, ventasEnRango } from './ventas'

/** Fila de `presupuesto` (⚠ SUP-33: metas de venta, ⚠ SUP-52). */
export interface PresupuestoFila {
  id: string
  periodo: string
  regional_id: string
  vendedor_id: string | null
  categoria: CategoriaCliente | null
  meta: number
  observaciones: string | null
}

const MES = HOY.slice(0, 7)
const ANTERIOR = sumarMeses(MES, -1)

// Metas de ejemplo: las del dashboard (regionales y vendedores) para el mes en
// curso y las regionales para el mes anterior.
export const PRESUPUESTOS: PresupuestoFila[] = [
  ...REGIONALES.flatMap((r) => [
    { id: `pre-${r.codigo}`, periodo: MES, regional_id: r.id, vendedor_id: null, categoria: null, meta: INDICADORES_REGIONAL[r.id].meta_mes, observaciones: null },
    { id: `pre-${r.codigo}-ant`, periodo: ANTERIOR, regional_id: r.id, vendedor_id: null, categoria: null, meta: Math.round(INDICADORES_REGIONAL[r.id].meta_mes * 0.95), observaciones: null },
  ]),
  ...METAS_VENDEDOR.map((m) => ({ id: m.id, periodo: MES, regional_id: m.regional_id, vendedor_id: VENDEDORES.find((v) => v.nombre === m.vendedor)?.id ?? null, categoria: null, meta: m.meta, observaciones: null })),
]

/** Reglas §8: notas emitidas del mes − devoluciones, con el filtro de la meta. */
function realDe(p: PresupuestoFila): number {
  const desde = `${p.periodo}-01`
  if (desde > HOY) return 0
  const fin = finDeMes(desde)
  const hasta = fin < HOY ? fin : HOY
  const devoluciones = (filtro: (notaId: string) => boolean) =>
    DEVOLUCIONES.filter((d) => d.regional_id === p.regional_id && d.fecha >= desde && d.fecha <= hasta && filtro(d.nota_venta_id)).reduce((t, d) => t + d.importe, 0)
  if (!p.vendedor_id && !p.categoria) return redondear(ventasEnRango(p.regional_id, desde, hasta) - devoluciones(() => true))
  // Los vendedores de ejemplo traen su real del mes; el resto sale de sus notas.
  const ejemplo = METAS_VENDEDOR.find((m) => m.id === p.id && p.periodo === MES)
  const coincide = (n: (typeof NOTAS)[number]) =>
    (!p.vendedor_id || n.vendedor_id === p.vendedor_id) && (!p.categoria || CLIENTES.find((c) => c.id === n.cliente_id)?.categoria === p.categoria)
  const notas = NOTAS.filter((n) => n.regional_id === p.regional_id && n.estado === 'emitida' && n.fecha >= desde && n.fecha <= hasta && coincide(n))
  const ids = new Set(notas.map((n) => n.id))
  return redondear((ejemplo?.real ?? 0) + notas.reduce((t, n) => t + n.total, 0) - devoluciones((id) => ids.has(id)))
}

/** Cumplimiento y proyección de cierre de una meta (Reglas §8). */
export function cumplimientoDe(p: PresupuestoFila): CumplimientoPresupuesto & { regional_id: string; vendedor_id: string | null; observaciones: string | null } {
  const real = realDe(p)
  const dias = diasEnMes(p.periodo)
  const transcurridos = p.periodo === MES ? Number(HOY.slice(8)) : p.periodo < MES ? dias : 0
  const proyeccion = transcurridos > 0 ? (real / transcurridos) * dias : null
  const estado: EstadoPresupuesto =
    p.periodo < MES
      ? real >= p.meta
        ? 'cumplido'
        : 'no_cumplido'
      : real >= p.meta
        ? 'cumplido'
        : (proyeccion ?? 0) >= p.meta
          ? 'en_camino'
          : (proyeccion ?? 0) >= p.meta * 0.9
            ? 'en_riesgo'
            : 'bajo'
  return {
    presupuesto_id: p.id,
    periodo: p.periodo,
    regional_id: p.regional_id,
    regional: REGIONALES.find((r) => r.id === p.regional_id)?.nombre ?? '',
    vendedor_id: p.vendedor_id,
    vendedor: VENDEDORES.find((v) => v.id === p.vendedor_id)?.nombre ?? null,
    categoria: p.categoria,
    meta: p.meta,
    real,
    cumplimiento_pct: p.meta > 0 ? (real / p.meta) * 100 : 0,
    proyeccion,
    estado,
    observaciones: p.observaciones,
  }
}
