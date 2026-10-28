import { iniciales } from '@/shared/layout/usuario'
import { cn } from './cn'

const TAM = { sm: 'size-7 text-mini', md: 'size-8 text-mini', lg: 'size-10 text-cuerpo' }

// Iniciales del usuario sobre el color de marca (sidebar, topbar, login demo).
export function Avatar({ nombre, tam = 'md', className }: { nombre: string; tam?: keyof typeof TAM; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-rojo font-semibold text-white select-none', TAM[tam], className)} aria-hidden>
      {iniciales(nombre)}
    </span>
  )
}
