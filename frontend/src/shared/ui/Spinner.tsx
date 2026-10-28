import { cn } from './cn'

const TAM = { sm: 'size-3.5 border-2', md: 'size-4 border-2', lg: 'size-6 border-[2.5px]' }

// Indicador de carga en línea: aro con un tramo de color que gira. Toma el
// color del texto (currentColor), así sirve sobre botones claros y de marca.
export function Spinner({ tam = 'md', className }: { tam?: keyof typeof TAM; className?: string }) {
  return <span className={cn('inline-block animate-spin rounded-full border-current/25 border-t-current', TAM[tam], className)} aria-hidden />
}
