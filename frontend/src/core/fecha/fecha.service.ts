import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'
import { hoyBolivia } from '@/shared/format/fecha'

// "Hoy" lo decide la base (RNF-29): nunca el reloj del navegador para validar.
export interface ServicioFecha {
  hoy(opciones?: OpcionesPeticion): Promise<string>
}

const fixtures: ServicioFecha = {
  async hoy() {
    return hoyBolivia()
  },
}

const supabaseImpl: ServicioFecha = {
  async hoy(opciones) {
    let peticion = supabase().rpc('hoy')
    if (opciones?.signal) peticion = peticion.abortSignal(opciones.signal)
    return dato<string>(await peticion)
  },
}

export const fechaService: ServicioFecha = MODO_FIXTURES ? fixtures : supabaseImpl
