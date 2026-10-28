import { EMPRESA } from '@/core/empresa'
import type { NotaDetalle } from '@/core/models/nota-venta'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha, formatoFechaHora } from '@/shared/format/fecha'
import { formatoMonto, formatoPct } from '@/shared/format/moneda'
import { numeroALetras } from '@/shared/format/numeroALetras'
import { cn } from '@/shared/ui/cn'

interface Props {
  nota: NotaDetalle
  copia: 'cliente' | 'control'
  /** Más de 12 ítems: la copia ocupa una A4 entera. */
  largo: boolean
}

// Una copia de la nota (07-Impresion §2): diseño de la demo F1 (⚠ SUP-01).
// La condición de pago va solo en la copia de control (Q10, CP-06.6).
export function NotaImpresa({ nota, copia, largo }: Props) {
  const anulada = nota.estado === 'anulada'
  return (
    <div className={cn('relative flex flex-col overflow-hidden p-[8mm] text-chico', largo ? 'min-h-[297mm]' : 'h-[148.5mm]')}>
      {anulada && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="-rotate-[28deg] text-[64pt] font-bold tracking-widest text-texto/10">ANULADA</span>
        </div>
      )}

      <header className="flex items-start justify-between gap-4 border-b border-texto pb-2">
        <div>
          <p className="font-marca text-subtitulo font-extrabold">{EMPRESA.razonSocial}</p>
          <p>{EMPRESA.rubro}</p>
          <p className="text-mini text-texto-2">
            NIT {EMPRESA.nit} · {EMPRESA.direccion}
          </p>
        </div>
        <div className="text-right">
          <p className="text-mini font-semibold tracking-wide text-texto-2">{copia === 'cliente' ? 'COPIA CLIENTE' : 'COPIA VENDEDOR / CONTROL'}</p>
          <p className="text-medio font-bold">NOTA DE VENTA</p>
          <p className="tabular-nums">
            N° <b>{nota.numero}</b> · Fecha {formatoFecha(nota.fecha)}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-0.5 py-2">
        <div className="flex gap-2">
          <dt className="text-texto-2">Cliente</dt>
          <dd className="font-medium">
            {nota.cliente_nombre}
            {nota.cliente_nit && ` (NIT ${nota.cliente_nit})`}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-texto-2">Regional</dt>
          <dd>{nota.regional_codigo}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-texto-2">Vendedor</dt>
          <dd>{nota.vendedor_nombre}</dd>
        </div>
        {nota.numero_factura && (
          <div className="flex gap-2">
            <dt className="text-texto-2">Factura</dt>
            <dd>{nota.numero_factura}</dd>
          </div>
        )}
      </dl>

      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-y border-texto text-left">
            <th className="w-6 py-1 font-semibold">#</th>
            <th className="py-1 font-semibold">Producto</th>
            <th className="py-1 font-semibold">Línea</th>
            <th className="py-1 text-right font-semibold">Cant.</th>
            <th className="py-1 text-right font-semibold">P. Unit.</th>
            <th className="py-1 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {nota.items.map((i, indice) => (
            <tr key={i.producto_id} className="border-b border-borde">
              <td className="py-0.5">{indice + 1}</td>
              <td className="py-0.5">{i.producto_nombre}</td>
              <td className="py-0.5 text-texto-2">{i.linea_nombre}</td>
              <td className="py-0.5 text-right">{formatoCantidad(i.cantidad)}</td>
              <td className="py-0.5 text-right">{formatoMonto(i.precio_aplicado)}</td>
              <td className="py-0.5 text-right">{formatoMonto(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 ml-auto grid grid-cols-[auto_auto] gap-x-6 text-right tabular-nums">
        <span>Descuento {formatoPct(nota.descuento_pct, nota.descuento_pct % 1 ? 2 : 0)}:</span>
        <span>Bs {formatoMonto(nota.descuento_bs)}</span>
        <span className="font-bold">TOTAL:</span>
        <span className="font-bold">Bs {formatoMonto(nota.total)}</span>
      </div>
      <p className="mt-1">Son: {numeroALetras(nota.total)}</p>
      {copia === 'control' && (
        <p className="mt-0.5">
          Condición de pago: <b>{nota.condicion_nombre}</b>
          {nota.condicion_tipo === 'credito' && ` · Vence ${formatoFecha(nota.fecha_vencimiento)}`}
        </p>
      )}
      {anulada && (
        <p className="mt-0.5 font-semibold">
          Anulada el {formatoFechaHora(nota.anulada_en)}
          {nota.motivo_anulacion && ` · ${nota.motivo_anulacion}`}
        </p>
      )}

      <div className="mt-auto grid grid-cols-2 gap-16 px-8 pt-6 text-center">
        <p className="border-t border-texto pt-1">Firma vendedor</p>
        <p className="border-t border-texto pt-1">Firma cliente / Sello</p>
      </div>
    </div>
  )
}
