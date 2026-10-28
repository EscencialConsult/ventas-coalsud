import { NavLink } from 'react-router-dom'
import * as m from 'motion/react-m'
import { useId } from 'react'
import { cn } from './cn'

export interface Pestana {
  etiqueta: string
  a: string
}

// Pestañas de navegación (subrutas de un área, p. ej. Catálogo): enlaces con
// la ruta activa subrayada; el subrayado se desliza de una a otra.
export function Pestanas({ pestanas, etiqueta }: { pestanas: Pestana[]; etiqueta: string }) {
  const id = useId()
  return (
    <nav aria-label={etiqueta} className="flex gap-1 overflow-x-auto border-b border-borde px-2 sm:px-3">
      {pestanas.map((p) => (
        <NavLink
          key={p.a}
          to={p.a}
          className={({ isActive }) =>
            cn(
              'relative flex h-11 shrink-0 items-center px-3 text-cuerpo font-medium whitespace-nowrap transition-colors',
              isActive ? 'text-texto' : 'text-texto-3 hover:text-texto-2 active:text-texto',
            )
          }
        >
          {({ isActive }) => (
            <>
              {p.etiqueta}
              {isActive && <m.span layoutId={`pestana-${id}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-rojo" transition={{ type: 'spring', stiffness: 500, damping: 40 }} aria-hidden />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
