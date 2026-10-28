import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import { POR_PAGINA, type CondicionPago, type LineaComercial, type Producto } from '@/core/models/maestros'
import { responder } from '@/fixtures/latencia'
import { CONDICIONES, LINEAS, nuevoId, PRODUCTOS, STOCK } from '@/fixtures/maestros'
import { exigirNacional, limpio, mismoTexto, regionalesLegibles } from '@/fixtures/sesion'
import type { ServicioCatalogo } from './catalogo.service'

const ordenLinea = (id: string) => LINEAS.find((l) => l.id === id)?.orden ?? 0

const porEstado = (activo: boolean, estado: string) => estado === 'todos' || (estado === 'activos' ? activo : !activo)

export const catalogoFixtures: ServicioCatalogo = {
  async productos(filtros, pagina, opciones) {
    const q = filtros.q.toLowerCase()
    const filas = PRODUCTOS.filter(
      (p) =>
        (!q || p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q)) &&
        (!filtros.lineaId || p.linea_id === filtros.lineaId) &&
        porEstado(p.activo, filtros.estado),
    ).sort((a, b) => ordenLinea(a.linea_id) - ordenLinea(b.linea_id) || a.orden - b.orden)
    return responder({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filas.length }, opciones)
  },

  async productosActivos(opciones) {
    return responder(PRODUCTOS.filter((p) => p.activo).sort((a, b) => ordenLinea(a.linea_id) - ordenLinea(b.linea_id) || a.orden - b.orden), opciones)
  },

  async guardarProducto(id, datos) {
    exigirNacional()
    const nombre = limpio(datos.nombre)?.toUpperCase()
    const codigo = limpio(datos.codigo)
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    const linea = LINEAS.find((l) => l.id === datos.linea_id)
    if (!linea) throw new ErrorNegocio('VALIDACION', 'Elija la línea.', { campo: 'linea_id' })
    if (!(datos.precio_base >= 0)) throw new ErrorNegocio('VALIDACION', 'El precio no puede ser negativo.', { campo: 'precio_base' })
    if (!(datos.stock_minimo >= 0)) throw new ErrorNegocio('VALIDACION', 'El mínimo no puede ser negativo.', { campo: 'stock_minimo' })
    if (PRODUCTOS.some((p) => p.id !== id && mismoTexto(p.nombre, nombre))) throw new ErrorNegocio('DUPLICADO', 'Ya existe un producto con ese nombre.', { campo: 'nombre' })
    if (codigo && PRODUCTOS.some((p) => p.id !== id && p.codigo === codigo)) throw new ErrorNegocio('DUPLICADO', 'Ya existe un producto con ese código.', { campo: 'codigo' })

    const valores = { ...datos, nombre, codigo, linea_comercial: { nombre: linea.nombre } }
    if (id) {
      const producto = PRODUCTOS.find((p) => p.id === id)
      if (!producto) throw new ErrorNegocio('NO_ENCONTRADO', 'El producto no existe.')
      Object.assign(producto, valores)
      return responder(producto)
    }
    const nuevo: Producto = { id: nuevoId('pro'), ...valores }
    PRODUCTOS.push(nuevo)
    return responder(nuevo)
  },

  async stockDeProductos(ids, regionalId, opciones) {
    const regionales = regionalesLegibles(regionalId)
    return responder(
      STOCK.filter((s) => ids.includes(s.producto_id) && regionales.includes(s.regional_id)),
      opciones,
    )
  },

  async lineas(opciones) {
    return responder([...LINEAS].sort((a, b) => a.orden - b.orden), opciones)
  },

  async guardarLinea(id, datos) {
    exigirNacional()
    const nombre = limpio(datos.nombre)?.toUpperCase()
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    if (LINEAS.some((l) => l.id !== id && mismoTexto(l.nombre, nombre))) throw new ErrorNegocio('DUPLICADO', 'Ya existe una línea con ese nombre.', { campo: 'nombre' })
    if (id) {
      const linea = LINEAS.find((l) => l.id === id)
      if (!linea) throw new ErrorNegocio('NO_ENCONTRADO', 'La línea no existe.')
      Object.assign(linea, { nombre, activo: datos.activo })
      PRODUCTOS.filter((p) => p.linea_id === id).forEach((p) => (p.linea_comercial = { nombre }))
      return responder(linea)
    }
    // Una línea nueva va al final del reporte diario.
    const nueva: LineaComercial = { id: nuevoId('lin'), nombre, orden: Math.max(0, ...LINEAS.map((l) => l.orden)) + 1, activo: true }
    LINEAS.push(nueva)
    return responder(nueva)
  },

  async reordenarLineas(cambios) {
    exigirNacional()
    for (const { id, orden } of cambios) {
      const linea = LINEAS.find((l) => l.id === id)
      if (linea) linea.orden = orden
    }
    await responder(null)
  },

  async condiciones(opciones) {
    return responder([...CONDICIONES].sort((a, b) => a.orden - b.orden), opciones)
  },

  async guardarCondicion(id, datos) {
    exigirNacional()
    const nombre = limpio(datos.nombre)
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    // check (dias >= 0 and (tipo = 'credito' or dias = 0))
    if (datos.tipo === 'contado' && datos.dias !== 0) throw new ErrorNegocio('VALIDACION', 'Una condición de contado tiene 0 días.', { campo: 'dias' })
    if (datos.tipo === 'credito' && !(datos.dias > 0)) throw new ErrorNegocio('VALIDACION', 'Indique los días de crédito.', { campo: 'dias' })
    if (CONDICIONES.some((c) => c.id !== id && mismoTexto(c.nombre, nombre))) throw new ErrorNegocio('DUPLICADO', 'Ya existe una condición con ese nombre.', { campo: 'nombre' })
    if (id) {
      const condicion = CONDICIONES.find((c) => c.id === id)
      if (!condicion) throw new ErrorNegocio('NO_ENCONTRADO', 'La condición no existe.')
      Object.assign(condicion, { ...datos, nombre })
      return responder(condicion)
    }
    const nueva: CondicionPago = { id: nuevoId('cp'), ...datos, nombre, activo: true }
    CONDICIONES.push(nueva)
    return responder(nueva)
  },
}
