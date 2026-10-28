import { Plus, Trash2 } from 'lucide-react'
import type { TipoDocumento } from '@/core/models/inventario'
import { formatoCantidad } from '@/shared/format/cantidad'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { Input, Select } from '@/shared/ui/Campo'
import type { OpcionSelector } from '@/shared/ui/Selector'
import { leerCantidad } from '../inventario.calculos'
import { TIPOS_DOCUMENTO } from '../inventario.tipos'

export interface FilaItem {
  clave: string
  producto_id: string
  cantidad: string
}

interface Props {
  tipo: TipoDocumento
  filas: FilaItem[]
  errores: Record<string, string>
  /** Productos elegibles para una fila (sin los ya usados en otras). */
  opciones: (fila: FilaItem) => OpcionSelector[]
  /** Saldo de la ubicación de origen; null mientras carga. */
  disponible: (productoId: string) => number | null
  alCambiar: (clave: string, cambios: Partial<Omit<FilaItem, 'clave'>>) => void
  alQuitar: (clave: string) => void
  alAgregar: () => void
}

const GRILLA = 'grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_96px_136px_36px] sm:items-start'

// Ítems de un documento de inventario: un producto por fila, con lo disponible
// en el origen (informativo: la base revalida) y la cantidad.
export function ItemsDocumento({ tipo, filas, errores, opciones, disponible, alCambiar, alQuitar, alAgregar }: Props) {
  const config = TIPOS_DOCUMENTO[tipo]
  const cargadas = filas.filter((f) => f.producto_id)
  const total = cargadas.reduce((t, f) => t + (leerCantidad(f.cantidad) ?? 0), 0)

  return (
    <div>
      <div className={`${GRILLA} hidden border-b border-borde px-4 py-2.5 text-mini font-semibold text-texto-3 uppercase sm:grid`} aria-hidden>
        <span>Producto</span>
        <span className="text-right">{config.disponible}</span>
        <span>Cantidad</span>
        <span />
      </div>
      <ul aria-label="Productos del documento" className="divide-y divide-borde/70">
        {filas.map((f) => {
          const saldo = f.producto_id ? disponible(f.producto_id) : null
          const nombre = opciones(f).find((o) => o.valor === f.producto_id)?.etiqueta
          const error = errores[f.clave]
          return (
            <li key={f.clave} className={`${GRILLA} px-4 py-3`}>
              <Select
                label="Producto"
                labelSoloMovil
                buscable
                placeholder="Buscar producto…"
                valor={f.producto_id}
                opciones={opciones(f)}
                alCambiar={(producto_id) => alCambiar(f.clave, { producto_id })}
                error={!f.producto_id ? error : undefined}
                className="col-span-3 sm:col-span-1"
              />
              <div className="flex flex-col gap-1.5 sm:items-end">
                <span className="text-chico font-semibold text-texto-2 sm:sr-only">{config.disponible}</span>
                <span className="flex h-[38px] items-center text-texto-2 tabular-nums">{f.producto_id ? (saldo === null ? '…' : formatoCantidad(saldo)) : '—'}</span>
              </div>
              <Input
                label="Cantidad"
                labelSoloMovil
                inputMode="decimal"
                placeholder={tipo === 'ajuste' ? '+/−' : '0'}
                value={f.cantidad}
                onChange={(e) => alCambiar(f.clave, { cantidad: e.target.value })}
                error={f.producto_id ? error : undefined}
                className="min-w-0"
              />
              <div className="flex items-end pb-[5px] sm:items-start sm:pt-[5px] sm:pb-0">
                <BotonIcono etiqueta={nombre ? `Quitar ${nombre}` : 'Quitar fila'} disabled={filas.length === 1 && !f.producto_id && !f.cantidad} onClick={() => alQuitar(f.clave)}>
                  <Trash2 size={15} />
                </BotonIcono>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde px-4 py-3">
        <Button variante="secundario" tam="sm" icono={<Plus size={14} />} onClick={alAgregar}>
          Agregar producto
        </Button>
        <span className="text-chico text-texto-3 tabular-nums">
          {cargadas.length} productos · Total <b className="font-semibold text-texto">{formatoCantidad(total)}</b>
        </span>
      </div>
    </div>
  )
}
