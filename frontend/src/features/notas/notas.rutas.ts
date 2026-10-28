// Las impresiones son pestañas sin shell (07-Impresion §1).
export const rutaImpresionNota = (id: string) => `/imprimir/nota/${id}`

export const imprimirNota = (id: string) => window.open(rutaImpresionNota(id), '_blank')
