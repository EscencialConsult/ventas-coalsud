import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import type { Almacen, RegionalMaestro } from '@/core/models/maestros'
import { responder } from '@/fixtures/latencia'
import { ALMACENES, nuevoId, REGIONALES_CON_DOCUMENTOS, REGIONALES_MAESTRO } from '@/fixtures/maestros'
import { exigirNacional, limpio, mismoTexto } from '@/fixtures/sesion'
import { MODO_FIXTURES } from '@/lib/config'
import type { OpcionesPeticion } from '@/lib/peticion'
import { dato, supabase } from '@/lib/supabase'

// Regionales y almacenes (06-pantallas/05 §4): lee cualquiera (combos), edita
// solo el nacional (RLS patrón A). Servicio chico: dos implementaciones juntas.

export type DatosRegional = Pick<RegionalMaestro, 'codigo' | 'nombre' | 'activo'>
export type DatosAlmacen = Pick<Almacen, 'regional_id' | 'nombre' | 'activo'>

export interface ServicioConfiguracion {
  regionales(opciones?: OpcionesPeticion): Promise<RegionalMaestro[]>
  guardarRegional(id: string | null, datos: DatosRegional): Promise<RegionalMaestro>
  almacenes(opciones?: OpcionesPeticion): Promise<Almacen[]>
  guardarAlmacen(id: string | null, datos: DatosAlmacen): Promise<Almacen>
}

export const CODIGO_REGIONAL = /^[A-Z]{2,5}$/

// ── fixtures ──

const fixtures: ServicioConfiguracion = {
  async regionales(opciones) {
    return responder(REGIONALES_MAESTRO, opciones)
  },

  async guardarRegional(id, datos) {
    exigirNacional()
    const codigo = datos.codigo.trim().toUpperCase()
    const nombre = limpio(datos.nombre)
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    if (!CODIGO_REGIONAL.test(codigo)) throw new ErrorNegocio('VALIDACION', 'El código va de 2 a 5 letras mayúsculas (p. ej. LP).', { campo: 'codigo' })
    if (REGIONALES_MAESTRO.some((r) => r.id !== id && r.codigo === codigo)) throw new ErrorNegocio('DUPLICADO', 'Ya existe una regional con ese código.', { campo: 'codigo' })
    if (REGIONALES_MAESTRO.some((r) => r.id !== id && mismoTexto(r.nombre, nombre))) throw new ErrorNegocio('DUPLICADO', 'Ya existe una regional con ese nombre.', { campo: 'nombre' })
    if (id) {
      const regional = REGIONALES_MAESTRO.find((r) => r.id === id)
      if (!regional) throw new ErrorNegocio('NO_ENCONTRADO', 'La regional no existe.')
      // El prefijo numera los documentos: con documentos emitidos ya no cambia.
      if (regional.codigo !== codigo && REGIONALES_CON_DOCUMENTOS.has(id)) {
        throw new ErrorNegocio('INMUTABLE', 'El código no se puede cambiar: la regional ya tiene documentos con ese prefijo.', { campo: 'codigo' })
      }
      Object.assign(regional, { codigo, nombre, activo: datos.activo })
      return responder(regional)
    }
    const nueva: RegionalMaestro = { id: nuevoId('reg'), codigo, nombre, activo: true }
    REGIONALES_MAESTRO.push(nueva)
    return responder(nueva)
  },

  async almacenes(opciones) {
    return responder(ALMACENES, opciones)
  },

  async guardarAlmacen(id, datos) {
    exigirNacional()
    const nombre = limpio(datos.nombre)
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    if (!datos.regional_id) throw new ErrorNegocio('VALIDACION', 'Elija la regional.', { campo: 'regional_id' })
    if (ALMACENES.some((a) => a.id !== id && a.regional_id === datos.regional_id && mismoTexto(a.nombre, nombre))) {
      throw new ErrorNegocio('DUPLICADO', 'Esa regional ya tiene un almacén con ese nombre.', { campo: 'nombre' })
    }
    if (id) {
      const almacen = ALMACENES.find((a) => a.id === id)
      if (!almacen) throw new ErrorNegocio('NO_ENCONTRADO', 'El almacén no existe.')
      Object.assign(almacen, { ...datos, nombre })
      return responder(almacen)
    }
    const nuevo: Almacen = { id: nuevoId('alm'), ...datos, nombre, activo: true }
    ALMACENES.push(nuevo)
    return responder(nuevo)
  },
}

// ── supabase ──

const supabaseImpl: ServicioConfiguracion = {
  async regionales(opciones) {
    let consulta = supabase().from('regional').select('id, codigo, nombre, activo').order('nombre')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<RegionalMaestro[]>(await consulta)
  },
  async guardarRegional(id, datos) {
    const fila = { ...datos, codigo: datos.codigo.trim().toUpperCase(), nombre: datos.nombre.trim() }
    const consulta = id ? supabase().from('regional').update(fila).eq('id', id) : supabase().from('regional').insert(fila)
    return dato<RegionalMaestro>(await consulta.select('id, codigo, nombre, activo').single())
  },
  async almacenes(opciones) {
    let consulta = supabase().from('almacen').select('id, regional_id, nombre, activo').order('nombre')
    if (opciones?.signal) consulta = consulta.abortSignal(opciones.signal)
    return dato<Almacen[]>(await consulta)
  },
  async guardarAlmacen(id, datos) {
    const fila = { ...datos, nombre: datos.nombre.trim() }
    const consulta = id ? supabase().from('almacen').update(fila).eq('id', id) : supabase().from('almacen').insert(fila)
    return dato<Almacen>(await consulta.select('id, regional_id, nombre, activo').single())
  },
}

export const configuracionService: ServicioConfiguracion = MODO_FIXTURES ? fixtures : supabaseImpl
