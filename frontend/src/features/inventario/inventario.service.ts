import type { DocumentoDetalle, DocumentoInventario, DocumentoRegistrado, FilaKardex, FiltrosDocumentos, FiltrosMovimientos, Movimiento, NuevoDocumento, SaldoVendedor } from '@/core/models/inventario'
import type { Pagina, StockFila } from '@/core/models/maestros'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { inventarioFixtures } from './inventario.service.fixtures'
import { inventarioSupabase } from './inventario.service.supabase'

// Inventario (06-pantallas/06, CU-05): el stock no se edita; cambia solo con
// documentos (ingreso, salida, retorno, traspaso, ajuste), ventas y devoluciones.

export interface ParametrosKardex {
  almacenId: string
  /** Nulo = stock físico del almacén. */
  vendedorId: string | null
  productoId: string
  desde: string
  hasta: string
}

export interface ServicioInventario {
  /** v_stock completo de la regional (null = todas las legibles): es una lista corta. */
  stock(regionalId: string | null, opciones?: OpcionesPeticion): Promise<StockFila[]>
  kardex(parametros: ParametrosKardex, opciones?: OpcionesPeticion): Promise<FilaKardex[]>
  movimientos(regionalId: string | null, filtros: FiltrosMovimientos, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<Movimiento>>
  /** Incluye los traspasos recibidos de otra regional. */
  documentos(regionalId: string | null, filtros: FiltrosDocumentos, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<DocumentoInventario>>
  documento(id: string, opciones?: OpcionesPeticion): Promise<DocumentoDetalle>
  saldoVendedores(regionalId: string | null, desde: string, hasta: string, opciones?: OpcionesPeticion): Promise<SaldoVendedor[]>
  registrar(documento: NuevoDocumento): Promise<DocumentoRegistrado>
}

export const inventarioService: ServicioInventario = MODO_FIXTURES ? inventarioFixtures : inventarioSupabase
