import { useId, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from './cn'

interface Props {
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  children: ReactNode
  deshabilitada?: boolean
}

// Casilla de verificación propia sobre un <input type="checkbox"> real
// (accesible y navegable con teclado); la caja visible es decorativa.
export function Casilla({ marcada, alCambiar, children, deshabilitada = false }: Props) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2 text-cuerpo transition-[background-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rojo',
        // Neumorfismo: sin marcar va en relieve; marcada queda hundida.
        marcada ? 'border-rojo/20 bg-rojo-tenue shadow-hundido' : 'border-superficie bg-superficie shadow-relieve hover:bg-fondo-3 active:shadow-hundido',
        deshabilitada && 'cursor-not-allowed opacity-55',
      )}
    >
      <input id={id} type="checkbox" checked={marcada} disabled={deshabilitada} onChange={(e) => alCambiar(e.target.checked)} className="sr-only" />
      <span
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          marcada ? 'border-rojo bg-rojo text-white' : 'border-superficie bg-superficie shadow-hundido',
        )}
        aria-hidden
      >
        {marcada && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}
