import type { Avisos } from '@/core/models/dashboard'
import { perfilDemoActual } from '@/core/auth/auth.service.fixtures'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'
import { responder } from '@/fixtures/latencia'
import { bajoMinimo, LIQUIDACIONES_ABIERTAS, NOTAS } from '@/fixtures/ventas'
import { hoyBolivia } from '@/shared/format/fecha'

// Avisos del shell (06-pantallas/00 §1). Servicio chico: las dos
// implementaciones van en el mismo archivo.
export interface ServicioAvisos {
  obtener(regionalId: string | null, opciones?: OpcionesPeticion): Promise<Avisos>
}

const fixtures: ServicioAvisos = {
  async obtener(regionalId, opciones) {
    const hoy = hoyBolivia()
    // Imita la RLS: con "Todas", solo las regionales que el usuario puede leer.
    const ids = regionalId ? [regionalId] : (perfilDemoActual()?.regionales ?? []).map((r) => r.id)
    const notas = NOTAS.filter((n) => ids.includes(n.regional_id))
    return responder<Avisos>(
      {
        bajo_minimo: ids.reduce((s, r) => s + bajoMinimo(r), 0),
        notas_sin_factura: notas.filter((n) => n.pendiente_factura).length,
        dias_pendientes: LIQUIDACIONES_ABIERTAS.filter((l) => ids.includes(l.regional_id) && l.fecha < hoy).map((l) => ({
          regional_id: l.regional_id,
          fecha: l.fecha,
          notas_sin_factura: notas.filter((n) => n.fecha === l.fecha && n.regional_id === l.regional_id && n.pendiente_factura).length,
        })),
      },
      opciones,
    )
  },
}

const supabaseImpl: ServicioAvisos = {
  async obtener(regionalId, opciones) {
    let peticion = supabase().rpc('avisos_shell', { p_regional_id: regionalId })
    if (opciones?.signal) peticion = peticion.abortSignal(opciones.signal)
    return dato<Avisos>(await peticion)
  },
}

export const avisosService: ServicioAvisos = MODO_FIXTURES ? fixtures : supabaseImpl
