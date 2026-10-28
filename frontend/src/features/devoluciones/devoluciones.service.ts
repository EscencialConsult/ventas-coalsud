import type { Devolucion, DevolucionRegistrada, FiltrosDevoluciones, MaxDevolvible, NuevaDevolucion } from '@/core/models/cobranzas'
import type { Pagina } from '@/core/models/maestros'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { devolucionesFixtures } from './devoluciones.service.fixtures'
import { devolucionesSupabase } from './devoluciones.service.supabase'

// Devoluciones (06-pantallas/07 §4–5): sobre notas de un día ya cerrado; la
// fecha es hoy. Reembolso (sale de la caja) o abono a cuenta (baja el saldo).

export interface ServicioDevoluciones {
  maxDevolvible(notaId: string, opciones?: OpcionesPeticion): Promise<MaxDevolvible>
  registrar(devolucion: NuevaDevolucion): Promise<DevolucionRegistrada>
  listar(regionalId: string | null, filtros: FiltrosDevoluciones, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<Devolucion>>
  deNota(notaId: string, opciones?: OpcionesPeticion): Promise<Devolucion[]>
  /** N° de la nota de crédito de Contabilidad; se permite con el día cerrado. */
  registrarNc(id: string, numero: string): Promise<{ id: string; nc_contable_numero: string }>
}

export const devolucionesService: ServicioDevoluciones = MODO_FIXTURES ? devolucionesFixtures : devolucionesSupabase
