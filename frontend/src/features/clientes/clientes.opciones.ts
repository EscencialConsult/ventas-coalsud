import type { CategoriaCliente } from '@/core/models/maestros'
import type { Canal } from '@/core/models/nota-venta'

// Vocabularios de cliente (Esquema BD §1.9) con sus textos de pantalla.

export const CATEGORIAS: { valor: CategoriaCliente; etiqueta: string }[] = [
  { valor: 'supermercado', etiqueta: 'Supermercado' },
  { valor: 'mayorista', etiqueta: 'Mayorista' },
  { valor: 'minorista', etiqueta: 'Minorista' },
  { valor: 'institucional', etiqueta: 'Institucional' },
]

export const CANALES: { valor: Canal; etiqueta: string }[] = [
  { valor: 'supermercado', etiqueta: 'Supermercado' },
  { valor: 'ruta', etiqueta: 'Ruta' },
  { valor: 'institucional', etiqueta: 'Institucional' },
]

/** El canal se sugiere a partir de la categoría (06-pantallas/04 §1). */
export const CANAL_SUGERIDO: Record<CategoriaCliente, Canal> = {
  supermercado: 'supermercado',
  mayorista: 'ruta',
  minorista: 'ruta',
  institucional: 'institucional',
}

export const etiquetaCategoria = (c: CategoriaCliente) => CATEGORIAS.find((x) => x.valor === c)?.etiqueta ?? c
export const etiquetaCanal = (c: Canal) => CANALES.find((x) => x.valor === c)?.etiqueta ?? c

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
