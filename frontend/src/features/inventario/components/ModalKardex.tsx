import { useState } from 'react'
import { History } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { FilaKardex } from '@/core/models/inventario'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha, sumarDias } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Modal } from '@/shared/ui/Modal'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import type { StockProducto } from '../inventario.calculos'
import { useKardex } from '../inventario.queries'
import { TIPOS_MOVIMIENTO } from '../inventario.tipos'
import { CantidadMovimiento } from './CantidadMovimiento'

const DIAS_POR_DEFECTO = 30

const COLUMNAS: Columna<FilaKardex>[] = [
  { clave: 'fecha', titulo: 'Fecha', numerico: true, render: (k) => formatoFecha(k.fecha) },
  { clave: 'tipo', titulo: 'Tipo', render: (k) => <Badge variante={TIPOS_MOVIMIENTO[k.tipo].tono}>{TIPOS_MOVIMIENTO[k.tipo].etiqueta}</Badge> },
  { clave: 'documento', titulo: 'Documento', principalMovil: true, numerico: true, render: (k) => <span className="font-medium">{k.documento}</span> },
  { clave: 'cantidad', titulo: 'Cantidad', alinear: 'der', render: (k) => <CantidadMovimiento valor={k.cantidad} /> },
  { clave: 'anterior', titulo: 'Saldo ant.', alinear: 'der', numerico: true, ocultarEnMovil: true, render: (k) => <span className="text-texto-3">{formatoCantidad(k.saldo_anterior)}</span> },
  { clave: 'saldo', titulo: 'Saldo', alinear: 'der', numerico: true, render: (k) => <span className="font-semibold">{formatoCantidad(k.saldo_nuevo)}</span> },
  { clave: 'usuario', titulo: 'Usuario', ocultarEnMovil: true, render: (k) => k.usuario },
]

interface Props {
  producto: StockProducto
  /** Vista "Todas": el almacén se nombra con su regional. */
  variasRegionales: boolean
  alCerrar: () => void
}

// Kardex de un producto (06-pantallas/06 §1, rpc kardex): por ubicación
// (almacén o vendedor) y período; por defecto, los últimos 30 días.
export function ModalKardex({ producto, variasRegionales, alCerrar }: Props) {
  const hoy = useHoy()
  const ubicaciones = producto.ubicaciones
    .filter((u) => u.ubicacion === 'almacen' || u.cantidad > 0)
    .map((u) => ({ ...u, clave: `${u.almacen_id}|${u.vendedor_id ?? ''}`, etiqueta: u.vendedor_nombre ?? (variasRegionales ? u.almacen_nombre : 'Almacén') }))
  const [clave, setClave] = useState(ubicaciones[0]?.clave ?? '')
  const [periodo, setPeriodo] = useState({ desde: '', hasta: '' })
  const desde = periodo.desde || sumarDias(hoy, -DIAS_POR_DEFECTO)
  const hasta = periodo.hasta || hoy
  const ubicacion = ubicaciones.find((u) => u.clave === clave)
  const consulta = useKardex(ubicacion ? { almacenId: ubicacion.almacen_id, vendedorId: ubicacion.vendedor_id, productoId: producto.producto_id, desde, hasta } : null)

  return (
    <Modal abierto titulo={producto.producto_nombre} tam="xl" alCerrar={alCerrar}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ubicaciones.length > 1 && <FiltroSelect etiqueta="Ubicación" valor={clave} alCambiar={setClave} opciones={ubicaciones.map((u) => ({ valor: u.clave, etiqueta: u.etiqueta }))} />}
        <FiltroFechas desde={desde} hasta={hasta} max={hoy} resaltar={Boolean(periodo.desde)} alCambiar={(d, h) => setPeriodo({ desde: d, hasta: h })} />
        {ubicacion && (
          <span className="ml-auto text-chico text-texto-3">
            Saldo actual <b className="text-medio font-semibold text-texto tabular-nums">{formatoCantidad(ubicacion.cantidad)}</b>
          </span>
        )}
      </div>
      <div className="-mx-5 border-t border-borde">
        <SeccionConsulta consulta={consulta}>
          {(filas) => (
            <Tabla
              etiqueta={`Kardex de ${producto.producto_nombre}`}
              columnas={COLUMNAS}
              filas={filas}
              claveFila={(k) => k.id}
              vacio={<EmptyState icono={History} titulo="Sin movimientos en el período" />}
            />
          )}
        </SeccionConsulta>
      </div>
    </Modal>
  )
}
