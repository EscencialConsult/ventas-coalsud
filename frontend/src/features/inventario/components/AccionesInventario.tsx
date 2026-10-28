import { ArrowLeftRight, MoreHorizontal, Plus, SlidersHorizontal, Truck, Undo2 } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { BotonEnlace } from '@/shared/ui/Button'
import { Desplegable, ItemDesplegable } from '@/shared/ui/Desplegable'

// Botones del encabezado (06-pantallas/06): solo la regional opera. Salida y
// retorno van aparte: son de la modalidad "mercadería en poder" (⚠ SUP-07).
export function AccionesInventario() {
  const puede = usePermisos()
  if (!puede('inventario.operar')) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BotonEnlace a="/inventario/nuevo/ingreso" variante="primario" icono={<Plus size={16} />}>
        Ingreso
      </BotonEnlace>
      <BotonEnlace a="/inventario/nuevo/traspaso" icono={<ArrowLeftRight size={15} />}>
        Traspaso
      </BotonEnlace>
      <BotonEnlace a="/inventario/nuevo/ajuste" icono={<SlidersHorizontal size={15} />}>
        Ajuste
      </BotonEnlace>
      <Desplegable
        etiqueta="Mercadería de vendedores"
        className="w-60"
        disparador={(props, abierto) => (
          <BotonIcono tam="lg" etiqueta="Más documentos" sinTooltip={abierto} {...props}>
            <MoreHorizontal size={17} />
          </BotonIcono>
        )}
      >
        {(cerrar) => (
          <>
            <ItemDesplegable a="/inventario/nuevo/salida" onClick={cerrar} icono={<Truck />}>
              Salida a vendedor
            </ItemDesplegable>
            <ItemDesplegable a="/inventario/nuevo/retorno" onClick={cerrar} icono={<Undo2 />}>
              Retorno de vendedor
            </ItemDesplegable>
          </>
        )}
      </Desplegable>
    </div>
  )
}
