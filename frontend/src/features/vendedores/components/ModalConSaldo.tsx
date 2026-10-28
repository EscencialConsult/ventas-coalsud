import { PackageOpen, Undo2 } from 'lucide-react'
import type { StockFila } from '@/core/models/maestros'
import type { Vendedor } from '@/core/models/organizacion'
import { formatoCantidad } from '@/shared/format/cantidad'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { ChipIcono } from '@/shared/ui/ChipIcono'
import { Modal } from '@/shared/ui/Modal'
import { MontoBs } from '@/shared/ui/MontoBs'

// VENDEDOR_CON_SALDO (CP-03.6): no se puede desactivar con mercadería en su
// poder; se muestran los productos y el acceso directo a registrar el retorno.
export function ModalConSaldo({ vendedor, productos, alCerrar }: { vendedor: Vendedor; productos: StockFila[]; alCerrar: () => void }) {
  const total = productos.reduce((s, p) => s + p.cantidad * p.precio_base, 0)
  return (
    <Modal
      abierto
      titulo={`${vendedor.nombre} tiene mercadería en su poder`}
      alCerrar={alCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar}>
            Cerrar
          </Button>
          <BotonEnlace a={`/inventario/nuevo/retorno?vendedor=${vendedor.id}`} variante="primario" icono={<Undo2 size={15} />}>
            Registrar retorno
          </BotonEnlace>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <ChipIcono icono={PackageOpen} tono="alerta" />
        <p className="text-cuerpo text-texto-2">Para desactivarlo, primero registre el retorno de estos productos al almacén.</p>
      </div>
      <ul className="mt-4 divide-y divide-borde rounded-control border border-borde">
        {productos.map((p) => (
          <li key={p.producto_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-cuerpo">
            <span className="min-w-0 truncate">{p.producto_nombre}</span>
            <span className="shrink-0 font-medium tabular-nums">{formatoCantidad(p.cantidad)} u.</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-right text-cuerpo text-texto-2">
        Valor a precio base: <MontoBs valor={total} className="font-semibold text-texto" />
      </p>
    </Modal>
  )
}
