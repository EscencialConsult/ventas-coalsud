import type { CategoriaCliente } from '@/core/models/maestros'
import { responder } from '@/fixtures/latencia'
import { CLIENTES } from '@/fixtures/maestros'
import { REGIONALES, VENDEDORES } from '@/fixtures/organizacion'
import { exigirNacional } from '@/fixtures/sesion'
import { SALDOS } from '@/fixtures/ventas'
import { diasEntre, nombreMes } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// EECC consolidado (06-pantallas/11 §2, Reglas §6, Contrato §6.2) · solo nacional.

export interface ClienteEecc {
  cliente_id: string
  cliente: string
  vendedor: string | null
  saldos: Record<string, number>
  total: number
  vencido: number
  max_dias_mora: number
}

export interface GrupoEecc {
  regional: string
  categoria: CategoriaCliente
  clientes: ClienteEecc[]
  subtotal: Record<string, number>
}

export interface EeccConsolidado {
  fecha_corte: string
  columnas: { clave: string; etiqueta: string }[]
  kpis: { saldo_total: number; vencido: number; clientes_con_saldo: number; clientes_en_mora: number }
  grupos: GrupoEecc[]
  /** Por columna y `total`: la fila SALDO ACTUAL. */
  total_general: Record<string, number>
}

export interface ServicioEecc {
  consolidado(fechaCorte: string, regionalId: string | null, categoria: CategoriaCliente | '', opciones?: OpcionesPeticion): Promise<EeccConsolidado>
}

const CATEGORIAS_ORDEN: CategoriaCliente[] = ['supermercado', 'mayorista', 'minorista', 'institucional']

/** "Año anterior" + los meses del año hasta el de corte (⚠ SUP-26). */
function columnasDe(corte: string) {
  const anio = Number(corte.slice(0, 4))
  const meses = Array.from({ length: Number(corte.slice(5, 7)) }, (_, i) => ({ clave: `${anio}-${String(i + 1).padStart(2, '0')}`, etiqueta: nombreMes(i + 1).toUpperCase() }))
  return [{ clave: 'anterior', etiqueta: String(anio - 1) }, ...meses]
}

// En la demo, el saldo de cada documento es el de hoy (la base lo calcula a la fecha de corte).
const fixtures: ServicioEecc = {
  async consolidado(corte, regionalId, categoria, opciones) {
    exigirNacional()
    const columnas = columnasDe(corte)
    const anio = corte.slice(0, 4)
    const grupos = new Map<string, GrupoEecc>()
    const clientes = new Map<string, ClienteEecc>()
    for (const d of SALDOS) {
      if (d.saldo <= 0 || d.fecha > corte || (regionalId && d.regional_id !== regionalId)) continue
      const cliente = CLIENTES.find((c) => c.id === d.cliente_id)
      if (!cliente || (categoria && cliente.categoria !== categoria)) continue
      const columna = d.fecha.slice(0, 4) < anio ? 'anterior' : d.fecha.slice(0, 7)
      const regional = REGIONALES.find((r) => r.id === d.regional_id)?.nombre.toUpperCase() ?? ''
      const claveGrupo = `${regional}|${cliente.categoria}`
      const grupo = grupos.get(claveGrupo) ?? { regional, categoria: cliente.categoria, clientes: [], subtotal: {} }
      grupos.set(claveGrupo, grupo)
      let fila = clientes.get(cliente.id)
      if (!fila) {
        fila = { cliente_id: cliente.id, cliente: cliente.nombre.toUpperCase(), vendedor: VENDEDORES.find((v) => v.id === cliente.vendedor_id)?.nombre ?? null, saldos: {}, total: 0, vencido: 0, max_dias_mora: 0 }
        clientes.set(cliente.id, fila)
        grupo.clientes.push(fila)
      }
      fila.saldos[columna] = redondear((fila.saldos[columna] ?? 0) + d.saldo)
      fila.total = redondear(fila.total + d.saldo)
      const vence = d.fecha_vencimiento ?? d.fecha
      if (vence < corte) {
        fila.vencido = redondear(fila.vencido + d.saldo)
        fila.max_dias_mora = Math.max(fila.max_dias_mora, diasEntre(vence, corte) - 1)
      }
    }
    const total_general: Record<string, number> = {}
    const ordenados = [...grupos.values()].sort((a, b) => a.regional.localeCompare(b.regional) || CATEGORIAS_ORDEN.indexOf(a.categoria) - CATEGORIAS_ORDEN.indexOf(b.categoria))
    for (const g of ordenados) {
      g.clientes.sort((a, b) => a.cliente.localeCompare(b.cliente))
      for (const c of [...columnas.map((x) => x.clave), 'total']) {
        g.subtotal[c] = redondear(g.clientes.reduce((t, cl) => t + (c === 'total' ? cl.total : (cl.saldos[c] ?? 0)), 0))
        total_general[c] = redondear((total_general[c] ?? 0) + g.subtotal[c])
      }
    }
    const filas = [...clientes.values()]
    return responder(
      {
        fecha_corte: corte,
        columnas,
        kpis: {
          saldo_total: total_general.total ?? 0,
          vencido: redondear(filas.reduce((t, c) => t + c.vencido, 0)),
          clientes_con_saldo: filas.length,
          clientes_en_mora: filas.filter((c) => c.vencido > 0).length,
        },
        grupos: ordenados,
        total_general,
      },
      opciones,
    )
  },
}

const supabaseImpl: ServicioEecc = {
  async consolidado(corte, regionalId, categoria, opciones) {
    let consulta = supabase().rpc('eecc_consolidado', { p_fecha_corte: corte, p_regional_id: regionalId, p_categoria: categoria || null })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<EeccConsolidado>(await consulta)
  },
}

export const eeccService: ServicioEecc = MODO_FIXTURES ? fixtures : supabaseImpl
