import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { cn } from './cn'
import { RELIEVE, RELIEVE_INTERNO, TEXTO_RELIEVE } from './neumorfismo'
import { Spinner } from './Spinner'
import { useAccionAsync } from './useAccionAsync'
import { useTooltip, type LadoTooltip } from './useTooltip'

const VARIANTES = {
  // Relieve neumórfico sobre fondo claro (campana, cerrar modal, acciones de fila)
  relieve: cn('rounded-control', RELIEVE, TEXTO_RELIEVE),
  // Dentro de un campo o una pista hundida (ver contraseña, limpiar búsqueda, ajustes de fecha)
  interno: cn('size-7 rounded-[5px]', RELIEVE_INTERNO),
  // Sobre el sidebar oscuro
  oscuro: 'size-8 rounded-control text-white/40 hover:bg-white/10 hover:text-white/85 active:bg-white/15',
  // Dentro de una pastilla de marca (filtro activo)
  marca: 'size-7 rounded-[5px] text-rojo hover:bg-rojo/10 active:bg-rojo/15',
}

// Solo para la variante relieve; las demás tienen su tamaño.
const TAMANIOS = { md: 'size-8', lg: 'size-9' }

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'aria-label' | 'title'> {
  /** Obligatoria: un botón solo con ícono necesita nombre accesible. También es el texto del tooltip. */
  etiqueta: string
  variante?: keyof typeof VARIANTES
  tam?: keyof typeof TAMANIOS
  cargando?: boolean
  ladoTooltip?: LadoTooltip
  sinTooltip?: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown
  children: ReactNode
}

// Botón de solo ícono con los mismos tres estados que Button (regla 33).
export function BotonIcono({ etiqueta, variante = 'relieve', tam = 'md', cargando = false, ladoTooltip = 'abajo', sinTooltip = false, className, children, disabled, type = 'button', onClick, ...resto }: Props) {
  const { ocupado, alClic } = useAccionAsync(onClick)
  const { propsDisparador, tooltip } = useTooltip<HTMLButtonElement>(etiqueta, { lado: ladoTooltip, desactivado: sinTooltip })
  const enCarga = cargando || ocupado
  return (
    <>
      <button
        type={type}
        aria-label={etiqueta}
        disabled={disabled || enCarga}
        aria-busy={enCarga || undefined}
        onClick={alClic}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center transition-[background-color,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50',
          VARIANTES[variante],
          variante === 'relieve' && TAMANIOS[tam],
          className,
        )}
        {...resto}
        {...propsDisparador}
      >
        <span className={cn('inline-flex', enCarga && 'invisible')}>{children}</span>
        {enCarga && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner tam="sm" />
          </span>
        )}
      </button>
      {tooltip}
    </>
  )
}
