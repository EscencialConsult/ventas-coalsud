import type { LucideIcon } from 'lucide-react'
import { cn } from './cn'
import { TONOS, type Tono } from './tonos'

const TAM = {
  sm: 'size-7 [&>svg]:size-3.5',
  md: 'size-9 [&>svg]:size-[17px]',
  lg: 'size-11 [&>svg]:size-5',
}

// Ícono dentro de un cuadrado de fondo tenue: encabezados de card, KPIs y avisos.
export function ChipIcono({ icono: Icono, tono = 'neutro', tam = 'md', className }: { icono: LucideIcon; tono?: Tono; tam?: keyof typeof TAM; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-control', TONOS[tono].chip, TAM[tam], className)} aria-hidden>
      <Icono strokeWidth={2.1} />
    </span>
  )
}
