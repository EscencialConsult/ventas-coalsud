import type { ReactNode } from 'react'
import { useTooltip } from './useTooltip'

// Acción deshabilitada que explica por qué (06-pantallas/07 §3: "El día está
// cerrado: use Devolver"). Un botón deshabilitado no recibe eventos, así que el
// tooltip va en un contenedor enfocable; el motivo también queda para lectores.
export function ConMotivo({ motivo, children }: { motivo: string | null; children: ReactNode }) {
  const { propsDisparador, tooltip } = useTooltip<HTMLSpanElement>(motivo ?? '', { lado: 'abajo', desactivado: !motivo })
  if (!motivo) return <>{children}</>
  return (
    <>
      <span {...propsDisparador} tabIndex={0} className="inline-flex rounded-control outline-none focus-visible:ring-2 focus-visible:ring-rojo">
        {children}
        <span className="sr-only">{motivo}</span>
      </span>
      {tooltip}
    </>
  )
}
