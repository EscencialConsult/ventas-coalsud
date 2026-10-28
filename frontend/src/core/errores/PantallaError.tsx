import { TriangleAlert } from 'lucide-react'
import { ChipIcono } from '@/shared/ui/ChipIcono'
import { DetalleIncidente } from './DetalleIncidente'
import type { Incidente } from './incidentes'

// Pantalla de error en vez de una página en blanco (límite de errores y
// errores de ruta). No depende de router, sesión ni queries: puede mostrarse
// aunque haya fallado cualquiera de ellos.
export function PantallaError({ incidente }: { incidente: Incidente }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lienzo p-4">
      <section role="alert" className="w-full max-w-[560px] rounded-card border border-borde bg-white p-6 shadow-card sm:p-8">
        <ChipIcono icono={TriangleAlert} tono="error" tam="lg" className="mb-4" />
        <h1 className="mb-1 text-titulo leading-tight font-bold tracking-tight">Ocurrió un error inesperado</h1>
        <p className="mb-5 text-cuerpo text-texto-2">La pantalla no pudo mostrarse. Sus datos guardados no se perdieron.</p>
        <DetalleIncidente incidente={incidente} />
      </section>
    </div>
  )
}
