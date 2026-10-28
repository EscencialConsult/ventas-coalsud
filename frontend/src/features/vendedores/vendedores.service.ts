import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { StockFila } from '@/core/models/maestros'
import type { Vendedor } from '@/core/models/organizacion'
import { responder } from '@/fixtures/latencia'
import { nuevoId, STOCK } from '@/fixtures/maestros'
import { VENDEDORES } from '@/fixtures/organizacion'
import { exigirRegionalPropia, limpio, mismoTexto, regionalesLegibles } from '@/fixtures/sesion'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// Vendedores (06-pantallas/04 §2): los edita la regional (⚠ SUP-32). Servicio
// chico: las dos implementaciones van en el mismo archivo.

export type DatosVendedor = Pick<Vendedor, 'regional_id' | 'nombre' | 'telefono' | 'activo'>

export interface ServicioVendedores {
  /** regionalId null = todas las legibles. */
  listar(regionalId: string | null, opciones?: OpcionesPeticion): Promise<Vendedor[]>
  /** v_stock con ubicacion = 'vendedor': la mercadería en poder de cada uno. */
  enPoder(regionalId: string | null, opciones?: OpcionesPeticion): Promise<StockFila[]>
  guardar(id: string | null, datos: DatosVendedor): Promise<Vendedor>
}

const COLUMNAS_STOCK = 'producto_id, producto_nombre, linea_id, linea_nombre, orden, regional_id, ubicacion, almacen_id, almacen_nombre, vendedor_id, vendedor_nombre, cantidad, stock_minimo, bajo_minimo, precio_base'

// ── fixtures ──

const fixtures: ServicioVendedores = {
  async listar(regionalId, opciones) {
    const regionales = regionalesLegibles(regionalId)
    return responder(
      VENDEDORES.filter((v) => regionales.includes(v.regional_id)).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      opciones,
    )
  },

  async enPoder(regionalId, opciones) {
    const regionales = regionalesLegibles(regionalId)
    return responder(STOCK.filter((s) => s.ubicacion === 'vendedor' && s.cantidad > 0 && regionales.includes(s.regional_id)), opciones)
  },

  async guardar(id, datos) {
    exigirRegionalPropia(datos.regional_id)
    const nombre = limpio(datos.nombre)
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    if (VENDEDORES.some((v) => v.id !== id && v.regional_id === datos.regional_id && mismoTexto(v.nombre, nombre))) {
      throw new ErrorNegocio('DUPLICADO', 'Ya hay un vendedor con ese nombre en la regional.', { campo: 'nombre' })
    }
    const valores = { ...datos, nombre, telefono: limpio(datos.telefono) }
    if (id) {
      const vendedor = VENDEDORES.find((v) => v.id === id)
      if (!vendedor) throw new ErrorNegocio('NO_ENCONTRADO', 'El vendedor no existe.')
      // Trigger app.tg_vendedor_baja (CP-03.6).
      if (vendedor.activo && !valores.activo && STOCK.some((s) => s.vendedor_id === id && s.cantidad > 0)) {
        throw new ErrorNegocio('VENDEDOR_CON_SALDO', 'Tiene mercadería en su poder: primero debe registrar el retorno.')
      }
      Object.assign(vendedor, valores)
      return responder(vendedor)
    }
    const nuevo: Vendedor = { id: nuevoId('ven'), ...valores, activo: true }
    VENDEDORES.push(nuevo)
    return responder(nuevo)
  },
}

// ── supabase ──

const supabaseImpl: ServicioVendedores = {
  async listar(regionalId, opciones) {
    let consulta = supabase().from('vendedor').select('id, regional_id, nombre, telefono, activo').order('nombre')
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Vendedor[]>(await consulta)
  },
  async enPoder(regionalId, opciones) {
    let consulta = supabase().from('v_stock').select(COLUMNAS_STOCK).eq('ubicacion', 'vendedor').gt('cantidad', 0)
    if (regionalId) consulta = consulta.eq('regional_id', regionalId)
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<StockFila[]>(await consulta)
  },
  async guardar(id, datos) {
    const fila = { ...datos, nombre: datos.nombre.trim(), telefono: datos.telefono?.trim() || null }
    const consulta = id ? supabase().from('vendedor').update(fila).eq('id', id) : supabase().from('vendedor').insert(fila)
    return dato<Vendedor>(await consulta.select('id, regional_id, nombre, telefono, activo').single())
  },
}

export const vendedoresService: ServicioVendedores = MODO_FIXTURES ? fixtures : supabaseImpl
