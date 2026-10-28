import type { ReactNode } from 'react'
import { cn } from './cn'

/** Grilla de datos de un detalle (documento, nota): etiqueta chica gris y valor debajo. */
export function Datos({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4', className)}>{children}</dl>
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-chico text-texto-3">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium text-texto">{children}</dd>
    </div>
  )
}
