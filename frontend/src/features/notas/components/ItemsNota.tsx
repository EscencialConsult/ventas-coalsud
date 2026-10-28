import { Plus, Trash2 } from 'lucide-react'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoMonto, redondear } from '@/shared/format/moneda'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { Input, Select } from '@/shared/ui/Campo'
import { MontoBs } from '@/shared/ui/MontoBs'
import type { OpcionSelector } from '@/shared/ui/Selector'
import { leerNumero } from '../notas.calculos'
import type { AccionItems, ItemForm } from '../notas.items'

interface Props {
  items: ItemForm[]
  despachar: (accion: AccionItems) => void
  errores: Record<string, string>
  opciones: (item: ItemForm) => OpcionSelector[]
  /** Precio de lista y línea del producto. */
  producto: (id: string) => { precio_base: number; linea: string } | undefined
  /** Saldo del origen elegido (almacén o vendedor); null mientras carga. */
  disponible: (productoId: string) => number | null
}

const GRILLA = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_80px_100px_112px_104px_36px] sm:items-start'

// Fila: producto, disponible, cantidad, precio (editable, "modificado" si no es
// el de lista), subtotal. En móvil, disponible y subtotal van en una línea.
export function ItemsNota({ items, despachar, errores, opciones, producto, disponible }: Props) {
  return (
    <div>
      <div className={`${GRILLA} hidden border-b border-borde px-4 py-2.5 text-mini font-semibold text-texto-3 uppercase sm:grid`} aria-hidden>
        <span>Producto</span>
        <span className="text-right">Disponible</span>
        <span>Cantidad</span>
        <span>P/Unit</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>
      <ul aria-label="Productos de la nota" className="divide-y divide-borde/70">
        {items.map((it) => {
          const datos = it.producto_id ? producto(it.producto_id) : undefined
          const saldo = it.producto_id ? disponible(it.producto_id) : null
          const cantidad = leerNumero(it.cantidad)
          const precio = leerNumero(it.precio)
          const subtotal = cantidad !== null && precio !== null ? redondear(cantidad * precio) : null
          const modificado = datos !== undefined && precio !== null && precio !== datos.precio_base
          const error = errores[it.clave]
          const nombre = opciones(it).find((o) => o.valor === it.producto_id)?.etiqueta
          const textoDisponible = it.producto_id ? (saldo === null ? '…' : formatoCantidad(saldo)) : '—'
          return (
            <li key={it.clave} className={`${GRILLA} px-4 py-3`}>
              <Select
                label="Producto"
                labelSoloMovil
                buscable
                placeholder="Buscar producto…"
                valor={it.producto_id}
                opciones={opciones(it)}
                // Al elegir el producto se propone su precio de lista.
                alCambiar={(id) => despachar({ tipo: 'cambiar', clave: it.clave, cambios: { producto_id: id, precio: String(producto(id)?.precio_base.toFixed(2) ?? '') } })}
                ayuda={datos?.linea}
                error={!it.producto_id ? error : undefined}
                className="col-span-3 sm:col-span-1"
              />
              <span className="hidden h-[38px] items-center justify-end text-texto-2 tabular-nums sm:flex">{textoDisponible}</span>
              <Input
                label="Cantidad"
                labelSoloMovil
                inputMode="decimal"
                placeholder="0"
                value={it.cantidad}
                onChange={(e) => despachar({ tipo: 'cambiar', clave: it.clave, cambios: { cantidad: e.target.value } })}
                error={it.producto_id ? error : undefined}
                className="min-w-0"
              />
              <Input
                label="P/Unit"
                labelSoloMovil
                inputMode="decimal"
                placeholder="0.00"
                value={it.precio}
                onChange={(e) => despachar({ tipo: 'cambiar', clave: it.clave, cambios: { precio: e.target.value } })}
                ayuda={modificado ? <span className="text-alerta">Lista {formatoMonto(datos.precio_base)} · modificado</span> : undefined}
                className="min-w-0"
              />
              <span className="hidden h-[38px] items-center justify-end font-medium sm:flex">{subtotal !== null ? <MontoBs valor={subtotal} /> : <span className="text-texto-3">—</span>}</span>
              <div className="flex items-end pb-[5px] sm:items-start sm:pt-[5px] sm:pb-0">
                <BotonIcono etiqueta={nombre ? `Quitar ${nombre}` : 'Quitar fila'} disabled={items.length === 1 && !it.producto_id && !it.cantidad} onClick={() => despachar({ tipo: 'quitar', clave: it.clave })}>
                  <Trash2 size={15} />
                </BotonIcono>
              </div>
              <p className="col-span-3 flex justify-between text-chico text-texto-3 tabular-nums sm:hidden">
                <span>Disponible {textoDisponible}</span>
                <span>Subtotal {subtotal !== null ? <MontoBs valor={subtotal} className="text-texto" /> : '—'}</span>
              </p>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-borde px-4 py-3">
        <Button variante="secundario" tam="sm" icono={<Plus size={14} />} onClick={() => despachar({ tipo: 'agregar' })}>
          Agregar producto
        </Button>
      </div>
    </div>
  )
}
