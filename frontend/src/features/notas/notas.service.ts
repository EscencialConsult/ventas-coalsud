import type { Pagina } from '@/core/models/maestros'
import type { FacturaRegistrada, FiltrosNotas, HojaCarga, NotaAnulada, NotaDetalle, NotaEmitida, NotaVenta, NuevaNota } from '@/core/models/nota-venta'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { notasFixtures } from './notas.service.fixtures'
import { notasSupabase } from './notas.service.supabase'

// Notas de venta (06-pantallas/07, CU-06): emitir, factura, anular, hoja de carga.

/** Límite del bucket `facturas` (Contrato §7). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024

export interface ServicioNotas {
  listar(regionalId: string | null, filtros: FiltrosNotas, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<NotaVenta>>
  /** Nota + ítems (dos lecturas en paralelo). */
  obtener(id: string, opciones?: OpcionesPeticion): Promise<NotaDetalle>
  emitir(nota: NuevaNota): Promise<NotaEmitida>
  /** Sube el PDF (si hay) y vincula N° y ruta; se permite con el día cerrado (⚠ SUP-06). */
  registrarFactura(nota: Pick<NotaVenta, 'id' | 'regional_id'>, numero: string, pdf: File | null): Promise<FacturaRegistrada>
  /** URL firmada (60 s) del PDF de la factura. */
  urlFactura(ruta: string): Promise<string>
  anular(id: string, motivo: string | null): Promise<NotaAnulada>
  hojaCarga(regionalId: string | null, fecha: string, vendedorId: string | null, opciones?: OpcionesPeticion): Promise<HojaCarga[]>
}

export const notasService: ServicioNotas = MODO_FIXTURES ? notasFixtures : notasSupabase
