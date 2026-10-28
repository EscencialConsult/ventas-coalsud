import type { FiltrosAuditoria, RegistroAuditoria } from '@/core/models/auditoria'
import { POR_PAGINA, type Pagina } from '@/core/models/maestros'
import { AUDITORIA } from '@/fixtures/auditoria'
import { responder } from '@/fixtures/latencia'
import { exigirNacional } from '@/fixtures/sesion'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// Auditoría (06-pantallas/12) · solo nacional y solo lectura.

export interface ServicioAuditoria {
  listar(regionalId: string | null, f: FiltrosAuditoria, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<RegistroAuditoria>>
  /** Todo el filtro, para el Excel (en lotes de 1000, 07-Impresion §7). */
  todos(regionalId: string | null, f: FiltrosAuditoria): Promise<RegistroAuditoria[]>
}

const LOTE = 1000

function filtrar(regionalId: string | null, f: FiltrosAuditoria) {
  exigirNacional()
  return AUDITORIA.filter(
    (r) =>
      (!regionalId || r.regional_id === regionalId) &&
      (!f.desde || r.created_at.slice(0, 10) >= f.desde) &&
      (!f.hasta || r.created_at.slice(0, 10) <= f.hasta) &&
      (!f.usuario || r.usuario_nombre === f.usuario) &&
      (!f.accion || r.accion === f.accion) &&
      (!f.entidad || r.entidad === f.entidad),
  ).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

const fixtures: ServicioAuditoria = {
  async listar(regionalId, f, pagina, opciones) {
    const filas = filtrar(regionalId, f)
    return responder({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filas.length }, opciones)
  },
  async todos(regionalId, f) {
    return responder(filtrar(regionalId, f))
  },
}

const COLUMNAS = 'id, created_at, usuario_nombre, regional_id, regional_codigo, accion, entidad, entidad_id, registro, datos'

function consulta(regionalId: string | null, f: FiltrosAuditoria, desde: number, hasta: number) {
  let q = supabase().from('v_auditoria').select(COLUMNAS, { count: 'exact' }).order('created_at', { ascending: false }).range(desde, hasta)
  if (regionalId) q = q.eq('regional_id', regionalId)
  if (f.desde) q = q.gte('created_at', `${f.desde}T00:00:00-04:00`)
  if (f.hasta) q = q.lte('created_at', `${f.hasta}T23:59:59-04:00`)
  if (f.usuario) q = q.eq('usuario_nombre', f.usuario)
  if (f.accion) q = q.eq('accion', f.accion)
  if (f.entidad) q = q.eq('entidad', f.entidad)
  return q
}

const supabaseImpl: ServicioAuditoria = {
  async listar(regionalId, f, pagina, opciones) {
    let q = consulta(regionalId, f, (pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    if (opciones?.signal) q = q.abortSignal(opciones.signal)
    const respuesta = await q
    return { filas: dato<RegistroAuditoria[]>(respuesta), total: respuesta.count ?? 0 }
  },
  // Lotes en serie: cada uno depende de saber si quedan más.
  async todos(regionalId, f) {
    const filas: RegistroAuditoria[] = []
    for (let desde = 0; ; desde += LOTE) {
      const lote = dato<RegistroAuditoria[]>(await consulta(regionalId, f, desde, desde + LOTE - 1))
      filas.push(...lote)
      if (lote.length < LOTE) return filas
    }
  },
}

export const auditoriaService: ServicioAuditoria = MODO_FIXTURES ? fixtures : supabaseImpl
