import { cn } from './cn'

interface Props {
  activo: boolean
  alCambiar: (activo: boolean) => void
  /** Nombre accesible ("Activo", "Cliente Andys activo"…). */
  etiqueta: string
  /** Texto visible a la derecha (en formularios). */
  texto?: string
  deshabilitado?: boolean
}

// Interruptor (switch): pista hundida y perilla en relieve, como el resto de
// los controles. role="switch" con aria-checked.
export function Interruptor({ activo, alCambiar, etiqueta, texto, deshabilitado = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={texto ? undefined : etiqueta}
      disabled={deshabilitado}
      onClick={(e) => {
        e.stopPropagation()
        alCambiar(!activo)
      }}
      className="group inline-flex items-center gap-2.5 rounded-full text-cuerpo disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          // Proporción 2:1 (uiverse.io / Adir-SL) con neumorfismo: pista hundida
          // (roja de la marca cuando está activo) y perilla en relieve que se desliza un alto.
          'relative inline-flex h-[18px] w-[36px] shrink-0 items-center rounded-full p-[2px] transition-[background-color,box-shadow] duration-200 ease-out',
          activo ? 'bg-rojo shadow-hundido-marca' : 'bg-superficie shadow-pista group-hover:bg-fondo-3',
        )}
      >
        <span
          className={cn(
            // Tailwind 4: translate y scale son propiedades propias (no transform). Leve rebote al llegar.
            'size-[14px] rounded-full shadow-perilla transition-[translate,scale,background-color] duration-200 ease-[cubic-bezier(0.34,1.45,0.64,1)] group-active:scale-90',
            activo ? 'translate-x-[18px] bg-white' : 'translate-x-0 bg-borde-2',
          )}
          aria-hidden
        />
      </span>
      {texto && <span className="text-texto">{texto}</span>}
    </button>
  )
}
