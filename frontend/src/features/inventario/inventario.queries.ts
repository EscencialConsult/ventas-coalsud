import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FiltrosDocumentos, FiltrosMovimientos, NuevoDocumento } from '@/core/models/inventario'
import { inventarioService, type ParametrosKardex } from './inventario.service'

// Contrato §9: tras un documento se invalidan stock, movimientos, liquidación y
// avisos. Todo lo que deriva del saldo (v_stock, kardex, saldo de vendedores,
// stock del catálogo, mercadería en poder) cuelga de ['stock'].
export const clavesInventario = {
  stock: (regionalId: string | null) => ['stock', 'inventario', regionalId] as const,
  kardex: (p: ParametrosKardex) => ['stock', 'kardex', p.almacenId, p.vendedorId, p.productoId, p.desde, p.hasta] as const,
  saldoVendedores: (regionalId: string | null, desde: string, hasta: string) => ['stock', 'saldo-vendedores', regionalId, desde, hasta] as const,
  movimientos: (regionalId: string | null, f: FiltrosMovimientos, pagina: number) => ['movimientos', regionalId, f.desde, f.hasta, f.tipo, f.productoId, f.documento, pagina] as const,
  documentos: (regionalId: string | null, f: FiltrosDocumentos, pagina: number) => ['documentos-inventario', regionalId, f.tipo, f.desde, f.hasta, pagina] as const,
  documento: (id: string) => ['documento-inventario', id] as const,
}

/** v_stock entero de la regional: Stock, combos y "disponible" del formulario comparten esta consulta. */
export function useStockInventario(regionalId: string | null, habilitado = true) {
  return useQuery({ queryKey: clavesInventario.stock(regionalId), queryFn: ({ signal }) => inventarioService.stock(regionalId, { signal }), enabled: habilitado })
}

export function useKardex(parametros: ParametrosKardex | null) {
  return useQuery({
    queryKey: parametros ? clavesInventario.kardex(parametros) : ['stock', 'kardex', null],
    queryFn: ({ signal }) => (parametros ? inventarioService.kardex(parametros, { signal }) : Promise.resolve([])),
    enabled: parametros !== null,
  })
}

export function useMovimientos(regionalId: string | null, filtros: FiltrosMovimientos, pagina: number) {
  return useQuery({ queryKey: clavesInventario.movimientos(regionalId, filtros, pagina), queryFn: ({ signal }) => inventarioService.movimientos(regionalId, filtros, pagina, { signal }) })
}

export function useDocumentosInventario(regionalId: string | null, filtros: FiltrosDocumentos, pagina: number) {
  return useQuery({ queryKey: clavesInventario.documentos(regionalId, filtros, pagina), queryFn: ({ signal }) => inventarioService.documentos(regionalId, filtros, pagina, { signal }) })
}

export function useDocumentoInventario(id: string) {
  return useQuery({ queryKey: clavesInventario.documento(id), queryFn: ({ signal }) => inventarioService.documento(id, { signal }) })
}

export function useSaldoVendedores(regionalId: string | null, desde: string, hasta: string) {
  return useQuery({ queryKey: clavesInventario.saldoVendedores(regionalId, desde, hasta), queryFn: ({ signal }) => inventarioService.saldoVendedores(regionalId, desde, hasta, { signal }) })
}

export function useRegistrarDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documento: NuevoDocumento) => inventarioService.registrar(documento),
    onSuccess: () => {
      for (const clave of [['stock'], ['movimientos'], ['documentos-inventario'], ['liquidacion'], ['avisos']]) void qc.invalidateQueries({ queryKey: clave })
    },
    // El formulario marca la fila, el campo o muestra el banner.
    onError: () => undefined,
  })
}
