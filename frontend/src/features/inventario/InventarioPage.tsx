import { Outlet } from 'react-router-dom'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { Card } from '@/shared/ui/Card'
import { Pagina } from '@/shared/ui/Pagina'
import { Pestanas } from '@/shared/ui/Pestanas'
import { AccionesInventario } from './components/AccionesInventario'

const PESTANAS = [
  { etiqueta: 'Stock', a: '/inventario/stock' },
  { etiqueta: 'Movimientos', a: '/inventario/movimientos' },
  { etiqueta: 'Documentos', a: '/inventario/documentos' },
  { etiqueta: 'Vendedores', a: '/inventario/vendedores' },
]

// Inventario (06-pantallas/06, CU-05): cada pestaña es una subruta y pide sus
// datos al abrirse (regla 29). La regional es la del topbar.
export default function InventarioPage() {
  const { regionalActiva } = useRegionalActiva()
  return (
    <Pagina titulo="Inventario" subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'} acciones={<AccionesInventario />}>
      <Card sinPadding>
        <Pestanas etiqueta="Secciones de inventario" pestanas={PESTANAS} />
        <Outlet />
      </Card>
    </Pagina>
  )
}
