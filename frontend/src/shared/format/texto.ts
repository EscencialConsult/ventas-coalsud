/** Para comparar textos sin mayúsculas ni tildes ("Quínua" ~ "quinua"). */
export const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
