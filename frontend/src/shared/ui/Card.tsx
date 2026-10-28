import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChipIcono } from './ChipIcono'
import { cn } from './cn'
import type { Tono } from './tonos'

interface Props {
  titulo?: ReactNode
  subtitulo?: ReactNode
  acciones?: ReactNode
  /** Ícono del encabezado, en un chip del tono indicado. */
  icono?: LucideIcon
  tono?: Tono
  /** Para tablas: el contenido va pegado a los bordes. */
  sinPadding?: boolean
  className?: string
  children: ReactNode
}

export function Card({ titulo, subtitulo, acciones, icono, tono = 'neutro', sinPadding = false, className, children }: Props) {
  const conEncabezado = Boolean(titulo || acciones)
  return (
    <section className={cn('min-w-0 overflow-hidden rounded-card border border-borde bg-white shadow-card', className)}>
      {conEncabezado && (
        <header className={cn('flex flex-wrap items-center justify-between gap-3 px-5', sinPadding ? 'border-b border-borde py-3.5' : 'pt-4')}>
          <div className="flex min-w-0 items-center gap-3">
            {icono && <ChipIcono icono={icono} tono={tono} tam="sm" />}
            <div className="min-w-0">
              {titulo && <h2 className="text-subtitulo leading-tight font-semibold">{titulo}</h2>}
              {subtitulo && <p className="mt-0.5 text-chico text-texto-3">{subtitulo}</p>}
            </div>
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={sinPadding ? undefined : cn('p-5', conEncabezado && 'pt-4')}>{children}</div>
    </section>
  )
}
