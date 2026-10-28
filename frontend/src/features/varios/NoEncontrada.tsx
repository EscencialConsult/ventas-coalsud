import { ArrowLeft, Compass } from 'lucide-react'
import { BotonEnlace } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { EmptyState } from '@/shared/ui/Estados'

export default function NoEncontrada() {
  return (
    <Card className="animar-entrada">
      <EmptyState
        icono={Compass}
        titulo="No encontramos esa página"
        detalle="Puede que el enlace esté mal escrito o que la pantalla todavía no exista."
        accion={
          <BotonEnlace a="/" icono={<ArrowLeft size={15} />}>
            Volver al inicio
          </BotonEnlace>
        }
      />
    </Card>
  )
}
