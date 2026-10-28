import type { Cobranza, CobroRegistrado, DocumentoCartera, EstadoCobranza, IngresoVendedor, NuevoCobro } from '@/core/models/cobranzas'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { cobranzasFixtures } from './cobranzas.service.fixtures'
import { cobranzasSupabase } from './cobranzas.service.supabase'

// Cobranzas (06-pantallas/08, CU-07): sin menú propio; se registran desde la
// nota ("Cobrar") o la liquidación (⚠ SUP-51). Una cobranza por documento (⚠ SUP-22).

export interface ServicioCobranzas {
  /** v_cobranza de una nota (detalle de la nota). */
  deNota(notaId: string, opciones?: OpcionesPeticion): Promise<Cobranza[]>
  /** Cobranzas del día de una regional (pestaña Cobranzas de la liquidación). */
  delDia(regionalId: string, fecha: string, opciones?: OpcionesPeticion): Promise<Cobranza[]>
  registrar(cobro: NuevoCobro): Promise<CobroRegistrado[]>
  /** Día abierto y motivo obligatorio (⚠ SUP-23). */
  anular(id: string, motivo: string): Promise<{ id: string; estado: EstadoCobranza }>
  /** Reglas §7.2; con `detalle`, las notas de cada vendedor (impresión). */
  ingresosVendedores(regionalId: string | null, desde: string, hasta: string, detalle: boolean, opciones?: OpcionesPeticion): Promise<IngresoVendedor[]>
  /** Solo nacional (⚠ SUP-24). */
  cargarCartera(regionalId: string, documentos: DocumentoCartera[]): Promise<{ insertados: number }>
}

export const cobranzasService: ServicioCobranzas = MODO_FIXTURES ? cobranzasFixtures : cobranzasSupabase
