import { Outlet } from 'react-router-dom'
import { usePermisos } from '@/core/auth/usePermisos'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { Pagina } from '@/shared/ui/Pagina'
import { Pestanas } from '@/shared/ui/Pestanas'

const PESTANAS = [
  { etiqueta: 'Productos', a: '/catalogo/productos' },
  { etiqueta: 'Líneas', a: '/catalogo/lineas' },
  { etiqueta: 'Condiciones de pago', a: '/catalogo/condiciones' },
]

// Catálogo (06-pantallas/05 §1–3, CU-04): edita solo el nacional (⚠ SUP-02);
// el regional ve lo mismo en modo lectura.
export default function CatalogoPage() {
  const editable = usePermisos()('catalogo.editar')
  return (
    <Pagina titulo="Catálogo" subtitulo={editable ? undefined : <Badge variante="neutro">Solo lectura</Badge>}>
      <Card sinPadding>
        <Pestanas etiqueta="Secciones del catálogo" pestanas={PESTANAS} />
        <Outlet />
      </Card>
    </Pagina>
  )
}
