// Neumorfismo del proyecto (04-Sistema_de_Diseno §2), en un solo lugar:
// lo que se presiona va en relieve y se hunde al presionar o mientras su panel
// está abierto (como la campana); donde se escribe o se elige va hundido.

/** Botón en relieve sobre fondo claro. El color del texto lo pone cada control (p. ej. rojo si filtra). */
export const RELIEVE =
  'border border-superficie bg-superficie shadow-relieve hover:bg-fondo-3 active:shadow-hundido aria-expanded:shadow-hundido'

/** Texto de un control en relieve sin estado especial. */
export const TEXTO_RELIEVE = 'text-texto-2 hover:text-texto'

/** Botón en relieve dentro de una pista o un campo hundido (pastilla blanca). */
export const RELIEVE_INTERNO =
  'bg-white text-texto-3 shadow-card hover:text-texto active:bg-superficie active:shadow-hundido aria-expanded:bg-superficie aria-expanded:shadow-hundido'

/** Superficie hundida (pistas, casillas). El color del borde lo pone cada control. */
export const HUNDIDO = 'border bg-superficie shadow-hundido'

/** Campo donde se escribe o elige: hundido, y al enfocarlo se aclara. */
export const CAMPO = `rounded-control text-cuerpo text-texto outline-none transition-[border-color,background-color] duration-150 placeholder:text-texto-3 focus:bg-white focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60 ${HUNDIDO}`

export const BORDE_CAMPO = {
  normal: 'border-superficie hover:border-borde-2 focus:border-rojo/50 focus:ring-rojo/10',
  error: 'border-error focus:ring-error/10',
}
