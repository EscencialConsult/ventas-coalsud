import type { ReactNode } from 'react'

// Celda de dos líneas: el dato principal y, debajo, el secundario en gris.
// Permite tablas con menos columnas sin perder información.
export function DosLineas({ principal, secundario }: { principal: ReactNode; secundario?: ReactNode }) {
  return (
    <span className="block">
      <span className="block">{principal}</span>
      {secundario && <span className="block text-chico font-normal text-texto-3">{secundario}</span>}
    </span>
  )
}
