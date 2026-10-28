import { ErrorNegocio } from '@/core/errores/ErrorNegocio'
import { POR_PAGINA, type Cliente } from '@/core/models/maestros'
import { responder } from '@/fixtures/latencia'
import { CLIENTES, CONDICIONES, nuevoId } from '@/fixtures/maestros'
import { VENDEDORES } from '@/fixtures/organizacion'
import { exigirRegionalPropia, limpio, regionalesLegibles } from '@/fixtures/sesion'
import { NOTAS, SALDOS } from '@/fixtures/ventas'
import type { ServicioClientes } from './clientes.service'
import { EMAIL_VALIDO } from './clientes.opciones'

function buscar(id: string): Cliente {
  const cliente = CLIENTES.find((c) => c.id === id && regionalesLegibles(null).includes(c.regional_id))
  if (!cliente) throw new ErrorNegocio('NO_ENCONTRADO', 'El cliente no existe o no pertenece a sus regionales.')
  return cliente
}

export const clientesFixtures: ServicioClientes = {
  async listar(regionalId, filtros, pagina, opciones) {
    const regionales = regionalesLegibles(regionalId)
    const q = filtros.q.toLowerCase()
    const filas = CLIENTES.filter(
      (c) =>
        regionales.includes(c.regional_id) &&
        (!q || [c.nombre, c.razon_social, c.nit].some((t) => t?.toLowerCase().includes(q))) &&
        (!filtros.categoria || c.categoria === filtros.categoria) &&
        (!filtros.canal || c.canal === filtros.canal) &&
        (!filtros.vendedorId || c.vendedor_id === filtros.vendedorId) &&
        (filtros.estado === 'todos' || (filtros.estado === 'activos' ? c.activo : !c.activo)),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre))
    return responder({ filas: filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filas.length }, opciones)
  },

  async obtener(id, opciones) {
    return responder(buscar(id), opciones)
  },

  async guardar(id, datos) {
    // CP-03.3: solo en sus regionales (por API lo rechaza la RLS).
    exigirRegionalPropia(datos.regional_id)
    if (id) exigirRegionalPropia(buscar(id).regional_id)
    const nombre = limpio(datos.nombre)
    if (!nombre) throw new ErrorNegocio('VALIDACION', 'El nombre es obligatorio.', { campo: 'nombre' })
    const email = limpio(datos.email)?.toLowerCase() ?? null
    if (email && !EMAIL_VALIDO.test(email)) throw new ErrorNegocio('VALIDACION', 'El correo no tiene un formato válido.', { campo: 'email' })
    const condicion = CONDICIONES.find((c) => c.id === datos.condicion_pago_id && c.activo)
    if (!condicion) throw new ErrorNegocio('VALIDACION', 'Elija una condición de pago activa.', { campo: 'condicion_pago_id' })
    const vendedor = datos.vendedor_id ? VENDEDORES.find((v) => v.id === datos.vendedor_id) : null
    // Trigger app.tg_cliente_vendedor (CP-03.4).
    if (datos.vendedor_id && vendedor?.regional_id !== datos.regional_id) {
      throw new ErrorNegocio('VALIDACION', 'El vendedor debe ser de la misma regional del cliente.', { campo: 'vendedor_id' })
    }
    const valores: Omit<Cliente, 'id'> = {
      ...datos,
      nombre,
      email,
      razon_social: limpio(datos.razon_social),
      nit: limpio(datos.nit),
      zona: limpio(datos.zona),
      telefono: limpio(datos.telefono),
      direccion: limpio(datos.direccion),
      vendedor: vendedor ? { nombre: vendedor.nombre } : null,
      condicion_pago: { nombre: condicion.nombre, tipo: condicion.tipo, dias: condicion.dias },
    }
    if (id) {
      const cliente = buscar(id)
      Object.assign(cliente, valores)
      return responder(cliente)
    }
    const nuevo: Cliente = { id: nuevoId('cli'), ...valores, activo: true }
    CLIENTES.push(nuevo)
    return responder(nuevo)
  },

  async notas(clienteId, opciones) {
    buscar(clienteId)
    return responder(
      NOTAS.filter((n) => n.cliente_id === clienteId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero)),
      opciones,
    )
  },

  async porNombres(regionalId, nombres, opciones) {
    const buscados = new Set(nombres)
    return responder(CLIENTES.filter((c) => c.regional_id === regionalId && buscados.has(c.nombre)).map(({ id, nombre, regional_id }) => ({ id, nombre, regional_id })), opciones)
  },

  async saldos(clienteId, opciones) {
    buscar(clienteId)
    return responder(
      SALDOS.filter((s) => s.cliente_id === clienteId && s.saldo > 0).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      opciones,
    )
  },
}
