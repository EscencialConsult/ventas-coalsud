import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { CumplimientoPresupuesto } from '@/core/models/dashboard'
import { responder, esperar } from '@/fixtures/latencia'
import { nuevoId } from '@/fixtures/maestros'
import { cumplimientoDe, PRESUPUESTOS, type PresupuestoFila } from '@/fixtures/presupuesto'
import { exigirRegionalPropia, limpio, regionalesLegibles } from '@/fixtures/sesion'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// Presupuesto (06-pantallas/10, CU-09): metas de venta (⚠ SUP-33, ⚠ SUP-52).

export type Presupuesto = PresupuestoFila
export type DatosPresupuesto = Omit<Presupuesto, 'id'>

/** Fila de `cumplimiento_presupuesto` + los ids para editar la meta (⚙ DT-29). */
export type FilaCumplimiento = CumplimientoPresupuesto & { regional_id: string; vendedor_id: string | null; observaciones: string | null }

export interface ServicioPresupuesto {
  cumplimiento(periodo: string, regionalId: string | null, opciones?: OpcionesPeticion): Promise<FilaCumplimiento[]>
  guardar(id: string | null, datos: DatosPresupuesto): Promise<Presupuesto>
}

const fixtures: ServicioPresupuesto = {
  async cumplimiento(periodo, regionalId, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const filas = PRESUPUESTOS.filter((p) => p.periodo === periodo && regionales.includes(p.regional_id))
      .map(cumplimientoDe)
      // Primero la meta de la regional, después vendedores y categorías.
      .sort((a, b) => a.regional.localeCompare(b.regional) || Number(Boolean(a.vendedor ?? a.categoria)) - Number(Boolean(b.vendedor ?? b.categoria)) || (a.vendedor ?? '').localeCompare(b.vendedor ?? ''))
    return responder(filas, opciones)
  },

  async guardar(id, datos) {
    await esperar()
    // ⚠ SUP-33: el nacional, cualquier regional; el regional, las suyas.
    if (perfilDemoActual()?.rol !== 'nacional') exigirRegionalPropia(datos.regional_id)
    if (!/^\d{4}-\d{2}$/.test(datos.periodo)) throw new ErrorNegocio('VALIDACION', 'Elija el período.', { campo: 'periodo' })
    if (!(datos.meta > 0)) throw new ErrorNegocio('VALIDACION', 'La meta debe ser mayor a 0.', { campo: 'meta' })
    const repetida = PRESUPUESTOS.some(
      (p) => p.id !== id && p.periodo === datos.periodo && p.regional_id === datos.regional_id && p.vendedor_id === datos.vendedor_id && p.categoria === datos.categoria,
    )
    if (repetida) throw new ErrorNegocio('DUPLICADO', 'Ya existe una meta para esa combinación; edítela.', { campo: 'meta' })
    const valores = { ...datos, observaciones: limpio(datos.observaciones) }
    if (id) {
      const fila = PRESUPUESTOS.find((p) => p.id === id)
      if (!fila) throw new ErrorNegocio('NO_ENCONTRADO', 'La meta no existe.')
      Object.assign(fila, valores)
      return responder(fila)
    }
    const nueva: Presupuesto = { id: nuevoId('pre'), ...valores }
    PRESUPUESTOS.push(nueva)
    return responder(nueva)
  },
}

const COLUMNAS = 'id, periodo, regional_id, vendedor_id, categoria, meta, observaciones'

const supabaseImpl: ServicioPresupuesto = {
  async cumplimiento(periodo, regionalId, opciones) {
    let consulta = supabase().rpc('cumplimiento_presupuesto', { p_periodo: periodo, p_regional_id: regionalId })
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<FilaCumplimiento[]>(await consulta)
  },
  async guardar(id, datos) {
    const consulta = id ? supabase().from('presupuesto').update(datos).eq('id', id) : supabase().from('presupuesto').insert(datos)
    return dato<Presupuesto>(await consulta.select(COLUMNAS).single())
  },
}

export const presupuestoService: ServicioPresupuesto = MODO_FIXTURES ? fixtures : supabaseImpl
