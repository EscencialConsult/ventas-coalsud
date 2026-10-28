import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { avisarErrorToggle } from '@/core/errores/errorFormulario'
import type { Cliente, DatosCliente, FiltrosClientes } from '@/core/models/maestros'
import { agregarFila, cambiarFilaOptimista, reemplazarFila } from '@/lib/cacheListas'
import { clientesService, datosCliente } from './clientes.service'

// Claves con ids y strings (regla 30). Las listas cuelgan de ['clientes',
// 'lista'] para poder actualizarlas juntas tras una edición.
export const clavesClientes = {
  listas: ['clientes', 'lista'] as const,
  lista: (regionalId: string | null, f: FiltrosClientes, pagina: number) =>
    ['clientes', 'lista', regionalId, f.q, f.categoria, f.canal, f.vendedorId, f.estado, pagina] as const,
  detalle: (id: string) => ['clientes', 'detalle', id] as const,
  notas: (id: string) => ['clientes', 'notas', id] as const,
  // Contrato §9: la cobranza invalida ['saldos-cliente', cliente].
  saldos: (id: string) => ['saldos-cliente', id] as const,
}

export function useClientes(regionalId: string | null, filtros: FiltrosClientes, pagina: number) {
  return useQuery({
    queryKey: clavesClientes.lista(regionalId, filtros, pagina),
    queryFn: ({ signal }) => clientesService.listar(regionalId, filtros, pagina, { signal }),
  })
}

export function useCliente(id: string, habilitado = true) {
  return useQuery({ queryKey: clavesClientes.detalle(id), queryFn: ({ signal }) => clientesService.obtener(id, { signal }), enabled: habilitado })
}

/** Pestañas del detalle: se piden al abrirlas (regla 29). */
export function useNotasCliente(id: string) {
  return useQuery({ queryKey: clavesClientes.notas(id), queryFn: ({ signal }) => clientesService.notas(id, { signal }) })
}

export function useSaldosCliente(id: string, habilitado = true) {
  return useQuery({ queryKey: clavesClientes.saldos(id), queryFn: ({ signal }) => clientesService.saldos(id, { signal }), enabled: habilitado })
}

/** claveVisible: la lista en pantalla (el alta aparece arriba); null desde el detalle. */
export function useGuardarCliente(claveVisible: QueryKey | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string | null; datos: DatosCliente }) => clientesService.guardar(id, datos),
    onSuccess: (cliente, { id }) => {
      qc.setQueryData(clavesClientes.detalle(cliente.id), cliente)
      // La lista visible es de una regional (posición 2 de la clave; null = todas):
      // un alta en otra regional no se agrega ahí, solo deja las listas como viejas.
      const regionalVisible = claveVisible?.[2]
      if (id) reemplazarFila(qc, clavesClientes.listas, cliente)
      else if (claveVisible && (regionalVisible === null || regionalVisible === cliente.regional_id)) agregarFila(qc, clavesClientes.listas, claveVisible, cliente)
      else void qc.invalidateQueries({ queryKey: clavesClientes.listas, refetchType: 'none' })
    },
    // El formulario muestra el error en el campo o en un toast.
    onError: () => undefined,
  })
}

/** Activar/desactivar desde la lista: optimista con rollback y aviso (regla 15). */
export function useActivarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: Cliente) => clientesService.guardar(c.id, { ...datosCliente(c), activo: !c.activo }),
    onMutate: (c) => cambiarFilaOptimista<Cliente>(qc, clavesClientes.listas, c.id, { activo: !c.activo }),
    onSuccess: (cliente) => qc.setQueryData(clavesClientes.detalle(cliente.id), cliente),
    onError: (error, _c, deshacer) => {
      deshacer?.()
      avisarErrorToggle(error)
    },
  })
}
