export interface ItemForm {
  clave: string
  producto_id: string
  cantidad: string
  precio: string
}

export type AccionItems = { tipo: 'agregar' } | { tipo: 'quitar'; clave: string } | { tipo: 'cambiar'; clave: string; cambios: Partial<Omit<ItemForm, 'clave'>> }

let secuencia = 0
export const itemVacio = (): ItemForm => ({ clave: `item-${++secuencia}`, producto_id: '', cantidad: '', precio: '' })

/** Ítems de la nota (useReducer, FE-13): una fila por producto (⚠ SUP-47). */
export function reducirItems(items: ItemForm[], accion: AccionItems): ItemForm[] {
  switch (accion.tipo) {
    case 'agregar':
      return [...items, itemVacio()]
    case 'quitar':
      return items.length === 1 ? [itemVacio()] : items.filter((i) => i.clave !== accion.clave)
    case 'cambiar':
      return items.map((i) => (i.clave === accion.clave ? { ...i, ...accion.cambios } : i))
  }
}
