import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from './cn'
import { Spinner } from './Spinner'
import { useAccionAsync } from './useAccionAsync'

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'exito' | 'opcion'

// Relieve suave al reposo y sombra interior al presionar (estilo neumórfico,
// sin brillos): el botón "se hunde" al hacer clic.
const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-rojo text-white shadow-relieve hover:bg-rojo-2 hover:shadow-relieve-alto active:bg-rojo-3 active:shadow-hundido-marca',
  secundario:
    'bg-superficie text-texto border border-superficie shadow-relieve hover:bg-fondo-3 hover:shadow-relieve-alto active:text-texto-2 active:shadow-hundido',
  peligro:
    'bg-error-fondo text-error border border-error/15 shadow-relieve hover:bg-error hover:text-white active:bg-error active:text-white active:shadow-hundido-marca',
  exito: 'bg-ok-fondo text-ok border border-ok/15 shadow-relieve hover:bg-ok hover:text-white active:bg-ok active:text-white active:shadow-hundido-marca',
  // Tarjeta seleccionable de ancho completo (p. ej. "Entrar como…" del login).
  opcion:
    'w-full justify-start text-left border border-superficie bg-superficie shadow-relieve hover:bg-fondo-3 hover:shadow-relieve-alto active:shadow-hundido',
}

const TAMANIOS = {
  sm: 'h-[30px] px-2.5 text-chico gap-1.5',
  md: 'h-9 px-3.5 text-cuerpo gap-2',
  lg: 'h-11 px-5 text-medio gap-2',
}

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variante?: VarianteBoton
  tam?: keyof typeof TAMANIOS
  /** Carga controlada desde afuera (p. ej. el submit de un formulario con su mutación). */
  cargando?: boolean
  icono?: ReactNode
  /** Si devuelve una promesa, el botón queda en loading hasta que termine. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown
}

const BASE =
  'relative inline-flex shrink-0 items-center rounded-control font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 select-none'

function clasesBoton(variante: VarianteBoton, tam: keyof typeof TAMANIOS, className?: string) {
  return cn(BASE, variante === 'opcion' ? 'min-h-14 px-3.5 py-2.5 text-cuerpo' : cn(TAMANIOS[tam], 'justify-center whitespace-nowrap'), VARIANTES[variante], className)
}

// Tres estados visibles (regla 33): hover (fondo + relieve), pressed (sombra
// interior + oscurecer) y loading. En loading el contenido queda invisible pero
// ocupa su lugar: el ancho no salta.
export function Button({ variante = 'primario', tam = 'md', cargando = false, icono, className, children, disabled, type = 'button', onClick, ...resto }: Props) {
  const { ocupado, alClic } = useAccionAsync(onClick)
  const enCarga = cargando || ocupado

  return (
    <button
      type={type}
      disabled={disabled || enCarga}
      aria-busy={enCarga || undefined}
      onClick={alClic}
      className={clasesBoton(variante, tam, cn('disabled:cursor-not-allowed disabled:shadow-none', enCarga ? 'disabled:opacity-85' : 'disabled:opacity-55', className))}
      {...resto}
    >
      <span className={cn('inline-flex min-w-0 items-center gap-[inherit]', variante === 'opcion' && 'w-full gap-3', enCarga && 'invisible')}>
        {icono}
        {children}
      </span>
      {enCarga && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner tam="sm" />
        </span>
      )}
    </button>
  )
}

interface PropsEnlace {
  a: string
  variante?: Exclude<VarianteBoton, 'opcion'>
  tam?: keyof typeof TAMANIOS
  icono?: ReactNode
  className?: string
  children: ReactNode
}

/** Navegación con aspecto de botón (misma implementación de variantes, regla 13). */
export function BotonEnlace({ a, variante = 'secundario', tam = 'md', icono, className, children }: PropsEnlace) {
  return (
    <Link to={a} className={clasesBoton(variante, tam, className)}>
      <span className="inline-flex min-w-0 items-center gap-[inherit]">
        {icono}
        {children}
      </span>
    </Link>
  )
}
