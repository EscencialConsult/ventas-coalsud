import type { Cliente, DatosCliente, FiltrosClientes, Pagina, SaldoDocumento } from '@/core/models/maestros'
import type { NotaVentaResumen } from '@/core/models/nota-venta'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { clientesFixtures } from './clientes.service.fixtures'
import { clientesSupabase } from './clientes.service.supabase'

// Clientes (06-pantallas/04 §1, CU-03): cartera por regional. Los edita la
// regional (RLS patrón B); el nacional los lee.

/** Solo las columnas editables (lo que viaja en el update, sin las relaciones). */
export const datosCliente = (c: Cliente): DatosCliente => ({
  regional_id: c.regional_id,
  nombre: c.nombre,
  razon_social: c.razon_social,
  nit: c.nit,
  categoria: c.categoria,
  canal: c.canal,
  vendedor_id: c.vendedor_id,
  condicion_pago_id: c.condicion_pago_id,
  zona: c.zona,
  telefono: c.telefono,
  email: c.email,
  direccion: c.direccion,
  activo: c.activo,
})

export interface ServicioClientes {
  /** regionalId null = todas las legibles. */
  listar(regionalId: string | null, filtros: FiltrosClientes, pagina: number, opciones?: OpcionesPeticion): Promise<Pagina<Cliente>>
  obtener(id: string, opciones?: OpcionesPeticion): Promise<Cliente>
  /** Clientes de la regional con esos nombres exactos (carga de cartera inicial). */
  porNombres(regionalId: string, nombres: string[], opciones?: OpcionesPeticion): Promise<Pick<Cliente, 'id' | 'nombre' | 'regional_id'>[]>
  guardar(id: string | null, datos: DatosCliente): Promise<Cliente>
  /** Pestaña "Notas" del detalle (v_nota_venta). */
  notas(clienteId: string, opciones?: OpcionesPeticion): Promise<NotaVentaResumen[]>
  /** Pestaña "Saldo" del detalle (v_saldo_documento con saldo > 0). */
  saldos(clienteId: string, opciones?: OpcionesPeticion): Promise<SaldoDocumento[]>
}

export const clientesService: ServicioClientes = MODO_FIXTURES ? clientesFixtures : clientesSupabase
