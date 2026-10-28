import { useHoy } from '@/core/fecha/useHoy'
import type { CategoriaCliente } from '@/core/models/maestros'
import type { FiltrosReporte } from '@/core/models/reportes'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { inicioDeMes } from '@/shared/format/fecha'

const FILTROS = { desde: '', hasta: '', vendedor: '', linea: '', categoria: '' }

/** Filtros de los reportes en la URL; el período por defecto es el mes en curso. */
export function useFiltrosReporte() {
  const hoy = useHoy()
  const [crudos, cambiar] = useFiltrosUrl(FILTROS)
  const filtros: FiltrosReporte = {
    desde: crudos.desde || inicioDeMes(hoy),
    hasta: crudos.hasta || hoy,
    vendedorId: crudos.vendedor,
    lineaId: crudos.linea,
    categoria: crudos.categoria as CategoriaCliente | '',
  }
  return { filtros, crudos, cambiar, hoy }
}
