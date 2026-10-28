import type { DashboardKpis } from '@/core/models/dashboard'
import type { Rango } from '@/core/periodo/periodos'
import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { responder } from '@/fixtures/latencia'
import { cumplimientoDe, PRESUPUESTOS } from '@/fixtures/presupuesto'
import { REGIONALES } from '@/fixtures/organizacion'
import { HOY, INDICADORES_REGIONAL, NOTAS, ventasDelDia, ventasEnRango } from '@/fixtures/ventas'
import { diasEntre, diasEnMes, inicioDeMes, sumarDias, sumarMeses } from '@/shared/format/fecha'
import type { ServicioDashboard } from './dashboard.service'

// Imita la RLS: con "Todas" (null), cada usuario ve solo las regionales que puede leer.
function regionalesVisibles(regionalId: string | null): string[] {
  if (regionalId) return [regionalId]
  return (perfilDemoActual()?.regionales ?? []).map((r) => r.id)
}

// Reglas de Cálculo §8 (⚠ SUP-33): proyección lineal por días calendario.
// Período de comparación de la variación (Reglas de Cálculo §10, ⚙ DT-23):
// sin rango, el mismo tramo del mes anterior; con rango, los N días anteriores.
function periodoAnterior(rango: Rango | null): Rango {
  if (!rango) {
    const mes = sumarMeses(HOY.slice(0, 7), -1)
    const dia = Math.min(Number(HOY.slice(8)), diasEnMes(mes))
    return { desde: `${mes}-01`, hasta: `${mes}-${String(dia).padStart(2, '0')}` }
  }
  const dias = diasEntre(rango.desde, rango.hasta)
  return { desde: sumarDias(rango.desde, -dias), hasta: sumarDias(rango.desde, -1) }
}

const suma = (ids: string[], r: Rango) => ids.reduce((s, id) => s + ventasEnRango(id, r.desde, r.hasta), 0)

export const dashboardFixtures: ServicioDashboard = {
  async kpis(regionalId, rango, opciones) {
    const ids = regionalesVisibles(regionalId)
    const ind = ids.map((id) => INDICADORES_REGIONAL[id]).filter(Boolean)
    const esNacional = perfilDemoActual()?.rol === 'nacional'
    const periodo = rango ?? { desde: inicioDeMes(HOY), hasta: HOY }
    const ventasPeriodo = suma(ids, periodo)
    const ventasAnterior = suma(ids, periodoAnterior(rango))
    const serie = []
    for (let f = periodo.desde; f <= periodo.hasta; f = sumarDias(f, 1)) {
      serie.push({ fecha: f, ventas: ids.reduce((s, id) => s + ventasDelDia(id, f), 0) })
    }

    const kpis: DashboardKpis = {
      ventas_hoy: ids.reduce((s, id) => s + ventasDelDia(id, HOY), 0),
      ventas_periodo: ventasPeriodo,
      variacion_pct: ventasAnterior ? ((ventasPeriodo - ventasAnterior) / ventasAnterior) * 100 : null,
      serie,
    }
    // Q2: el KPI de cuentas por cobrar solo lo devuelve la base al nacional.
    if (esNacional) {
      kpis.cxc = { saldo: ind.reduce((s, i) => s + i.cxc_saldo, 0), vencido: ind.reduce((s, i) => s + i.cxc_vencido, 0) }
    }
    return responder(kpis, opciones)
  },

  async ventasPorRegional(desde, hasta, opciones) {
    const ids = regionalesVisibles(null)
    return responder(
      REGIONALES.filter((r) => ids.includes(r.id)).map((r) => ({
        regional_id: r.id,
        regional: r.nombre,
        mes: hasta.slice(0, 7),
        ventas_netas: ventasEnRango(r.id, desde, hasta),
      })),
      opciones,
    )
  },

  // Las mismas metas que la pantalla de Presupuesto (fixtures/presupuesto).
  async cumplimiento(_periodo, regionalId, opciones) {
    const ids = regionalesVisibles(regionalId)
    return responder(PRESUPUESTOS.filter((p) => p.periodo === HOY.slice(0, 7) && ids.includes(p.regional_id)).map(cumplimientoDe), opciones)
  },

  async ultimasNotas(regionalId, limite, rango, opciones) {
    const ids = regionalesVisibles(regionalId)
    const visibles = NOTAS.filter((n) => ids.includes(n.regional_id) && (!rango || (n.fecha >= rango.desde && n.fecha <= rango.hasta)))
    return responder(
      [...visibles].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero)).slice(0, limite),
      opciones,
    )
  },
}
