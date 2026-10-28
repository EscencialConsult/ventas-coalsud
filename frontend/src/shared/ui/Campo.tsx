import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { CircleAlert, type LucideIcon } from 'lucide-react'
import { cn } from './cn'
import { BORDE_CAMPO, CAMPO } from './neumorfismo'
import { Selector, type OpcionSelector } from './Selector'


interface PropsCampo {
  label: string
  /** Filas de una grilla con encabezado (ítems de un documento): la etiqueta se ve solo en móvil. */
  labelSoloMovil?: boolean
  requerido?: boolean
  error?: string
  ayuda?: ReactNode
  /** Ícono decorativo a la izquierda del control. */
  icono?: LucideIcon
  /** Elemento interactivo a la derecha, dentro del control (p. ej. ver contraseña). */
  sufijo?: ReactNode
  className?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; className: string }) => ReactNode
}

/** Etiqueta + control + error/ayuda. Los controles concretos van abajo. */
export function Campo({ label, labelSoloMovil = false, requerido, error, ayuda, icono: Icono, sufijo, className, children }: PropsCampo) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-chico font-semibold text-texto-2', labelSoloMovil && 'sm:sr-only')}>
        {label}
        {requerido && <span className="text-rojo"> *</span>}
      </label>
      <div className="relative">
        {Icono && <Icono size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-3" aria-hidden />}
        {children({
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error || ayuda ? idAyuda : undefined,
          className: cn(CAMPO, 'w-full px-3', error ? BORDE_CAMPO.error : BORDE_CAMPO.normal, Icono && 'pl-9', sufijo != null && 'pr-10'),
        })}
        {sufijo != null && <div className="absolute top-1/2 right-1 -translate-y-1/2">{sufijo}</div>}
      </div>
      {(error || ayuda) && (
        <p id={idAyuda} className={cn('flex items-start gap-1 text-chico', error ? 'text-error' : 'text-texto-3')}>
          {error && <CircleAlert size={13} className="mt-px shrink-0" aria-hidden />}
          {error ?? ayuda}
        </p>
      )}
    </div>
  )
}

type Base = { label: string; labelSoloMovil?: boolean; requerido?: boolean; error?: string; ayuda?: ReactNode; className?: string }

export function Input({ label, labelSoloMovil, requerido, error, ayuda, icono, sufijo, className, ...resto }: Base & Pick<PropsCampo, 'icono' | 'sufijo'> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Campo label={label} labelSoloMovil={labelSoloMovil} requerido={requerido} error={error} ayuda={ayuda} icono={icono} sufijo={sufijo} className={className}>
      {(p) => <input {...resto} {...p} className={cn(p.className, 'h-[38px]')} required={requerido} />}
    </Campo>
  )
}

type PropsSelect<T extends string> = Base & {
  valor: string
  opciones: OpcionSelector<T>[]
  alCambiar: (valor: T) => void
  placeholder?: string
  disabled?: boolean
  onBlur?: () => void
  buscable?: boolean
  alBuscar?: (texto: string) => void
  buscando?: boolean
  etiquetaElegida?: string
}

/** Select de formulario: misma etiqueta y error que los demás campos, con la lista propia de Selector. */
export function Select<T extends string>({ label, labelSoloMovil, requerido, error, ayuda, className, ...resto }: PropsSelect<T>) {
  return (
    <Campo label={label} labelSoloMovil={labelSoloMovil} requerido={requerido} error={error} ayuda={ayuda} className={className}>
      {(p) => <Selector {...resto} {...p} etiqueta={label} />}
    </Campo>
  )
}

export function Textarea({ label, requerido, error, ayuda, className, ...resto }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Campo label={label} requerido={requerido} error={error} ayuda={ayuda} className={className}>
      {(p) => <textarea {...resto} {...p} className={cn(p.className, 'min-h-[76px] resize-y py-2')} required={requerido} />}
    </Campo>
  )
}
